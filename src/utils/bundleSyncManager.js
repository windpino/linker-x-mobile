import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

// Supported bundle collections
export const BUNDLE_COLLECTIONS = [
  'products',
  'partners',
  'warehouses',
  'categories',
  'staffList',
  'schedules',
  'accounts',
  'vehicles',
  'vehicleLogs',
  'specialPrices',
  'purchaseInvoices',
  'purchaseOrders',
  'salesInvoices',
  'salesOrders',
  'quotations',
  'expenses',
  'inventoryAdjustments',
  'inventoryTransferHistory',
  'actionLogs'
];

/**
 * Deduplicate partners:
 * Merges partners with duplicate names or IDs into a single unified record.
 * Preserves numeric ID and combines fields from both records without data loss.
 */
export const deduplicatePartners = (list) => {
  if (!Array.isArray(list)) return [];
  const nameMap = new Map(); // normalizedName -> partner
  const idMap = new Map();   // string(id) -> normalizedName

  list.forEach(p => {
    if (!p || typeof p !== 'object') return;
    const rawName = String(p.name || '').trim();
    if (!rawName) return;

    const normName = rawName.toLowerCase();
    const strId = (p.id !== undefined && p.id !== null && p.id !== '') ? String(p.id) : null;

    // Check if duplicate by name or by ID
    let existingKey = null;
    if (nameMap.has(normName)) {
      existingKey = normName;
    } else if (strId && idMap.has(strId)) {
      existingKey = idMap.get(strId);
    }

    if (existingKey && nameMap.has(existingKey)) {
      const existing = nameMap.get(existingKey);

      // Determine primary vs secondary: prefer record with valid numeric id over string/composite alias id
      const existingIsNumeric = typeof existing.id === 'number' || (typeof existing.id === 'string' && /^\d+$/.test(existing.id));
      const pIsNumeric = strId && (typeof p.id === 'number' || (typeof p.id === 'string' && /^\d+$/.test(p.id)));

      const primary = (!existingIsNumeric && pIsNumeric) ? p : existing;
      const secondary = primary === p ? existing : p;

      // Merge non-empty properties so no details are lost
      const merged = { ...secondary, ...primary };
      Object.keys(secondary).forEach(k => {
        if ((merged[k] === undefined || merged[k] === null || merged[k] === '' || merged[k] === '-') &&
            secondary[k] !== undefined && secondary[k] !== null && secondary[k] !== '' && secondary[k] !== '-') {
          merged[k] = secondary[k];
        }
      });

      // Normalize numeric ID if applicable
      const chosenId = primary.id || secondary.id;
      if (chosenId !== undefined && chosenId !== null && /^\d+$/.test(String(chosenId))) {
        merged.id = Number(chosenId);
      } else {
        merged.id = chosenId;
      }
      delete merged._docId;

      nameMap.set(existingKey, merged);
      if (strId) idMap.set(strId, existingKey);
      if (merged.id) idMap.set(String(merged.id), existingKey);
    } else {
      const pCopy = { ...p };
      delete pCopy._docId;
      if (pCopy.id !== undefined && pCopy.id !== null && /^\d+$/.test(String(pCopy.id))) {
        pCopy.id = Number(pCopy.id);
      }
      nameMap.set(normName, pCopy);
      if (strId) idMap.set(strId, normName);
      if (pCopy.id) idMap.set(String(pCopy.id), normName);
    }
  });

  return Array.from(nameMap.values());
};

/**
 * Filter bundle list strictly for the target companyId and deduplicate
 */
export const filterBundleListForCompany = (companyId, colName, rawList) => {
  if (!Array.isArray(rawList) || !companyId) return [];
  const targetId = String(companyId);
  const requiresName = ['products', 'categories', 'partners', 'warehouses'].includes(colName);

  const filtered = rawList.filter(item => {
    if (!item || typeof item !== 'object') return false;
    if (requiresName && (!item.name || !String(item.name).trim())) return false;
    
    // Strict isolation: An item without companyId is legacy and ONLY belongs to 'no1dmkr'
    if (!item.companyId) {
      return targetId === 'no1dmkr';
    }
    return String(item.companyId) === targetId;
  });

  if (colName === 'partners') {
    return deduplicatePartners(filtered);
  }

  if (colName === 'products') {
    const prodMap = new Map();
    filtered.forEach(p => {
      if (!p || !p.id) return;
      prodMap.set(String(p.id), p);
    });
    return Array.from(prodMap.values());
  }

  return filtered;
};

/**
 * Get cached bundle from localStorage
 */
export const getLocalBundle = (companyId, colName) => {
  if (!companyId) return null;
  try {
    const raw = localStorage.getItem(`bundle_${colName}_${companyId}`) || localStorage.getItem(`${colName}_${companyId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : (parsed.list || parsed.items || []);
    return filterBundleListForCompany(companyId, colName, list);
  } catch (e) {
    console.warn(`[BundleSync] Error reading local bundle for ${colName}:`, e);
    return null;
  }
};

/**
 * Save bundle data and version to localStorage
 */
export const setLocalBundle = (companyId, colName, list, version = null) => {
  try {
    localStorage.setItem(`bundle_${colName}_${companyId}`, JSON.stringify(list));
    localStorage.setItem(`${colName}_${companyId}`, JSON.stringify(list));
    if (version !== null) {
      localStorage.setItem(`bundle_ver_${colName}_${companyId}`, String(version));
    }
  } catch (e) {
    console.warn(`[BundleSync] Error caching bundle for ${colName}:`, e);
  }
};

/**
 * Get local bundle version
 */
export const getLocalVersion = (companyId, colName) => {
  return Number(localStorage.getItem(`bundle_ver_${colName}_${companyId}`) || 0);
};

/**
 * Fetch a single bundle document from Firestore
 */
export const fetchBundle = async (companyId, colName) => {
  if (!companyId || !db) return [];
  try {
    const bundleDocRef = doc(db, 'companies', companyId, 'bundles', colName);
    const snap = await getDoc(bundleDocRef);

    if (snap.exists()) {
      const data = snap.data();
      const rawList = data.list || data.items || [];
      let list = filterBundleListForCompany(companyId, colName, rawList);

      // Auto-heal bundle document if duplicates were detected and pruned
      if (rawList.length > list.length) {
        console.log(`[BundleSync] 🧹 Auto-healing bundle for [${colName}] (pruned ${rawList.length - list.length} duplicates)`);
        const healVer = (Number(data.version) || 1) + 1;
        setDoc(bundleDocRef, {
          list: list,
          version: healVer,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(console.warn);
      }

      // 🛡️ RECONCILIATION SAFETY NET:
      // If the bundle is empty (e.g. deleted previously), but the actual collection in Firestore
      // has documents (e.g. imported via Excel or batch-inserted without updating bundle),
      // automatically reconcile and recover from the collection!
      if (list.length === 0 && (colName === 'partners' || colName === 'products' || colName === 'warehouses' || colName === 'staffList')) {
        try {
          const colRef = collection(db, 'companies', companyId, colName);
          const colSnap = await getDocs(colRef);
          if (!colSnap.empty) {
            const rawColList = colSnap.docs.map(d => {
              const docData = d.data();
              return {
                ...docData,
                _docId: d.id,
                id: docData.id !== undefined && docData.id !== null ? docData.id : (isNaN(Number(d.id)) ? d.id : Number(d.id))
              };
            });
            const filteredColList = filterBundleListForCompany(companyId, colName, rawColList);
            if (filteredColList.length > 0) {
              console.log(`[BundleSync] 🔄 Reconciled empty bundle for [${colName}] with ${filteredColList.length} documents from Firestore!`);
              const nextVer = (Number(data.version) || 1) + 1;
              await setDoc(bundleDocRef, {
                list: filteredColList,
                version: nextVer,
                updatedAt: new Date().toISOString()
              }, { merge: true });

              const syncStateRef = doc(db, 'companies', companyId, 'metadata', 'syncState');
              await setDoc(syncStateRef, {
                [colName]: { version: nextVer, updatedAt: new Date().toISOString() }
              }, { merge: true });

              setLocalBundle(companyId, colName, filteredColList, nextVer);
              return filteredColList;
            }
          }
        } catch (reconcileErr) {
          console.warn(`[BundleSync] Reconcile error for ${colName}:`, reconcileErr);
        }
      }

      const version = Number(data.version || 1);
      setLocalBundle(companyId, colName, list, version);
      return list;
    }

    // Fallback: Check legacy collection if bundle does not exist yet
    const legacyColRef = collection(db, 'companies', companyId, colName);
    const legacySnap = await getDocs(legacyColRef);

    if (!legacySnap.empty) {
      const rawList = legacySnap.docs.map(d => {
        const docData = d.data();
        return {
          ...docData,
          _docId: d.id,
          id: docData.id !== undefined && docData.id !== null ? docData.id : (isNaN(Number(d.id)) ? d.id : Number(d.id))
        };
      });
      const list = filterBundleListForCompany(companyId, colName, rawList);
      // Save as bundle on Firestore for future 1-read lookups
      await setDoc(bundleDocRef, {
        list: list,
        version: 1,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Initialize syncState
      const syncStateRef = doc(db, 'companies', companyId, 'metadata', 'syncState');
      await setDoc(syncStateRef, {
        [colName]: { version: 1, updatedAt: new Date().toISOString() }
      }, { merge: true });

      setLocalBundle(companyId, colName, list, 1);
      return list;
    }

    setLocalBundle(companyId, colName, [], 0);
    return [];
  } catch (err) {
    console.error(`[BundleSync] Fetch error for ${colName}:`, err);
    return getLocalBundle(companyId, colName) || [];
  }
};

/**
 * Save whole list as bundle in a single write operation (Write count: 1)
 */
export const saveBundle = async (companyId, colName, list) => {
  if (!companyId || !db) return;
  try {
    const cleanList = (list || []).map(item => {
      const clean = { ...item };
      delete clean._docId;
      return clean;
    });

    const nextVer = getLocalVersion(companyId, colName) + 1;
    const nowIso = new Date().toISOString();

    // 1. Write Bundle Document
    const bundleDocRef = doc(db, 'companies', companyId, 'bundles', colName);
    await setDoc(bundleDocRef, {
      list: cleanList,
      version: nextVer,
      updatedAt: nowIso
    });

    // 2. Update Live syncState Metadata
    const syncStateRef = doc(db, 'companies', companyId, 'metadata', 'syncState');
    await setDoc(syncStateRef, {
      [colName]: { version: nextVer, updatedAt: nowIso }
    }, { merge: true });

    // 3. Update local cache
    setLocalBundle(companyId, colName, cleanList, nextVer);
  } catch (err) {
    console.error(`[BundleSync] Error saving bundle ${colName}:`, err);
    throw err;
  }
};

/**
 * Upsert or Delete a single item inside the bundle (Write count: 1)
 */
export const saveBundleItem = async (companyId, colName, item, action = 'upsert') => {
  if (!companyId) return;
  const currentList = getLocalBundle(companyId, colName) || [];
  let nextList = [];

  const itemId = item.id || item._docId || item.userId || item.name;

  if (action === 'delete') {
    nextList = currentList.filter(existing => {
      const exId = existing.id || existing._docId || existing.userId || existing.name;
      return String(exId) !== String(itemId);
    });
  } else {
    // Upsert (Add or Update)
    let found = false;
    nextList = currentList.map(existing => {
      const exId = existing.id || existing._docId || existing.userId || existing.name;
      if (String(exId) === String(itemId)) {
        found = true;
        return { ...existing, ...item, updatedAt: new Date().toISOString() };
      }
      return existing;
    });

    if (!found) {
      nextList.push({ ...item, updatedAt: new Date().toISOString() });
    }
  }

  await saveBundle(companyId, colName, nextList);
  return nextList;
};

/**
 * One-time Bundle Sync (새로고침 또는 창을 열 때 1회 호출):
 * Reads syncState metadata document once, checks version difference, and fetches only updated bundles.
 * Zero background snapshot listeners!
 */
export const syncBundlesOnce = async (companyId, onBundleChange, targetCollections = BUNDLE_COLLECTIONS) => {
  if (!companyId || !db) return;
  try {
    const syncStateRef = doc(db, 'companies', companyId, 'metadata', 'syncState');
    const snapshot = await getDoc(syncStateRef);

    if (!snapshot.exists()) {
      // Initial fetch if metadata doesn't exist yet
      for (const colName of targetCollections) {
        const list = await fetchBundle(companyId, colName);
        if (onBundleChange) onBundleChange(colName, list);
      }
      return;
    }

    const syncData = snapshot.data() || {};
    const colsToCheck = targetCollections || BUNDLE_COLLECTIONS;

    for (const colName of colsToCheck) {
      const serverColState = syncData[colName];
      const localVer = getLocalVersion(companyId, colName);

      if (!serverColState) {
        const list = await fetchBundle(companyId, colName);
        if (onBundleChange) onBundleChange(colName, list);
        continue;
      }

      const serverVer = Number(serverColState.version || 0);

      // Only fetch from Firestore if local version is outdated or not present!
      if (serverVer > localVer || localVer === 0) {
        console.log(`[BundleSync] 🔄 Syncing outdated bundle [${colName}] (Local v${localVer} -> Server v${serverVer})`);
        const updatedList = await fetchBundle(companyId, colName);
        if (onBundleChange) onBundleChange(colName, updatedList);
      } else {
        const localList = getLocalBundle(companyId, colName);
        if (localList !== null && onBundleChange) {
          if (localList.length === 0 && (colName === 'partners' || colName === 'products')) {
            const updatedList = await fetchBundle(companyId, colName);
            if (onBundleChange) onBundleChange(colName, updatedList);
          } else {
            onBundleChange(colName, localList);
          }
        } else {
          const updatedList = await fetchBundle(companyId, colName);
          if (onBundleChange) onBundleChange(colName, updatedList);
        }
      }
    }
  } catch (err) {
    console.warn('[BundleSync] syncBundlesOnce error:', err?.message || err);
  }
};

/**
 * Backward-compatibility wrapper (no-op unsubscribe, single fetch)
 */
export const listenBundleSyncState = (companyId, onBundleChange) => {
  // Trigger single-time sync without background listener
  syncBundlesOnce(companyId, onBundleChange);
  return () => {};
};

/**
 * Completely clear all bundle documents and syncState from Firestore and localStorage
 */
export const clearAllBundles = async (companyId) => {
  if (!companyId || !db) return;
  try {
    const allCols = [...BUNDLE_COLLECTIONS, 'quotations'];
    const batch = writeBatch(db);
    allCols.forEach(colName => {
      const bundleDocRef = doc(db, 'companies', companyId, 'bundles', colName);
      batch.delete(bundleDocRef);
      try {
        localStorage.removeItem(`bundle_${colName}_${companyId}`);
        localStorage.removeItem(`${colName}_${companyId}`);
        localStorage.removeItem(`bundle_ver_${colName}_${companyId}`);
      } catch (e) {}
    });
    const syncStateRef = doc(db, 'companies', companyId, 'metadata', 'syncState');
    batch.delete(syncStateRef);
    await batch.commit();
    console.log(`[BundleSync] 🧹 All bundles and syncState completely cleared on Firestore for ${companyId}`);
  } catch (err) {
    console.warn('[BundleSync] Error clearing all bundles:', err);
  }
};

