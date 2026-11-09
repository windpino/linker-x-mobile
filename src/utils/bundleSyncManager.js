import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { getIdbBundle, setIdbBundle, removeIdbBundle, clearAllIdbBundles } from './idbBundleCache';

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
  const clientIdMap = new Map(); // string(clientId) -> normalizedName

  list.forEach(p => {
    if (!p || typeof p !== 'object') return;
    if (p.isDeleted === true || p.status === 'deleted') return;

    const rawName = String(p.name || '').trim();
    if (!rawName) return;

    const normName = rawName.toLowerCase();
    const strId = (p.id !== undefined && p.id !== null && p.id !== '') ? String(p.id) : null;
    const strClientId = (p.clientId || p._docId) ? String(p.clientId || p._docId) : null;

    // Check if duplicate by name, by clientId, or by ID
    let existingKey = null;
    if (nameMap.has(normName)) {
      existingKey = normName;
    } else if (strClientId && clientIdMap.has(strClientId)) {
      existingKey = clientIdMap.get(strClientId);
    } else if (strId && idMap.has(strId)) {
      existingKey = idMap.get(strId);
    }

    if (existingKey && nameMap.has(existingKey)) {
      const existing = nameMap.get(existingKey);

      // Determine primary vs secondary: prefer newer record by updatedAt
      const timeExisting = existing.updatedAt ? Date.parse(existing.updatedAt) : 0;
      const timeP = p.updatedAt ? Date.parse(p.updatedAt) : 0;

      const existingIsNumeric = typeof existing.id === 'number' || (typeof existing.id === 'string' && /^\d+$/.test(existing.id));
      const pIsNumeric = strId && (typeof p.id === 'number' || (typeof p.id === 'string' && /^\d+$/.test(p.id)));

      // If timestamps differ, the newer record is primary; otherwise prefer valid numeric id or the latest in list
      const primary = (timeP !== timeExisting)
        ? (timeP > timeExisting ? p : existing)
        : ((!existingIsNumeric && pIsNumeric) ? p : (existingIsNumeric && !pIsNumeric ? existing : p));
      const secondary = primary === p ? existing : p;

      // Merge non-empty properties so no details are lost
      const merged = { ...secondary, ...primary };
      Object.keys(secondary).forEach(k => {
        if ((merged[k] === undefined || merged[k] === null || merged[k] === '' || merged[k] === '-') &&
            secondary[k] !== undefined && secondary[k] !== null && secondary[k] !== '' && secondary[k] !== '-') {
          merged[k] = secondary[k];
        }
      });

      // Preserve previous partner names as aliases for historical invoice mapping
      const aliases = new Set([
        ...(Array.isArray(primary.aliases) ? primary.aliases : []),
        ...(Array.isArray(secondary.aliases) ? secondary.aliases : [])
      ]);
      const priName = String(primary.name || '').trim();
      const secName = String(secondary.name || '').trim();
      if (secName && secName.toLowerCase() !== priName.toLowerCase()) {
        aliases.add(secName);
      }
      if (aliases.size > 0) {
        merged.aliases = Array.from(aliases);
      }

      // Normalize numeric ID if applicable
      const chosenId = primary.id || secondary.id;
      if (chosenId !== undefined && chosenId !== null && /^\d+$/.test(String(chosenId))) {
        merged.id = Number(chosenId);
      } else {
        merged.id = chosenId;
      }
      merged.clientId = String(primary.clientId || secondary.clientId || primary._docId || secondary._docId || merged.id);
      delete merged._docId;

      const primaryNormName = priName.toLowerCase();
      if (existingKey !== primaryNormName) {
        nameMap.delete(existingKey);
      }
      nameMap.set(primaryNormName, merged);

      if (strId) idMap.set(strId, primaryNormName);
      if (merged.id) idMap.set(String(merged.id), primaryNormName);
      if (strClientId) clientIdMap.set(strClientId, primaryNormName);
      if (merged.clientId) clientIdMap.set(String(merged.clientId), primaryNormName);
    } else {
      const pCopy = { ...p };
      pCopy.clientId = String(pCopy.clientId || p._docId || pCopy.id);
      delete pCopy._docId;
      if (pCopy.id !== undefined && pCopy.id !== null && /^\d+$/.test(String(pCopy.id))) {
        pCopy.id = Number(pCopy.id);
      }
      nameMap.set(normName, pCopy);
      if (strId) idMap.set(strId, normName);
      if (pCopy.id) idMap.set(String(pCopy.id), normName);
      if (strClientId) clientIdMap.set(strClientId, normName);
      if (pCopy.clientId) clientIdMap.set(String(pCopy.clientId), normName);
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
  // Large collections (>3MB like salesInvoices) are stored in IndexedDB, not localStorage
  if (colName === 'salesInvoices') return null;
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
 * Save bundle data and version to localStorage (and IndexedDB for large datasets)
 */
export const setLocalBundle = (companyId, colName, list, version = null) => {
  try {
    const safeList = Array.isArray(list) ? list : [];
    const serialized = JSON.stringify(safeList);
    if (safeList.length === 0) {
      removeIdbBundle(companyId, colName);
      localStorage.setItem(`bundle_${colName}_${companyId}`, '[]');
      localStorage.setItem(`${colName}_${companyId}`, '[]');
    } else if (colName === 'salesInvoices' || serialized.length >= 3000000) {
      // Store large bundles or salesInvoices safely in IndexedDB
      setIdbBundle(companyId, colName, safeList);
      try {
        localStorage.removeItem(`bundle_${colName}_${companyId}`);
        localStorage.removeItem(`${colName}_${companyId}`);
      } catch (e) {}
    } else {
      localStorage.setItem(`bundle_${colName}_${companyId}`, serialized);
      localStorage.setItem(`${colName}_${companyId}`, serialized);
    }
    if (version !== null) {
      localStorage.setItem(`bundle_ver_${colName}_${companyId}`, String(version));
    }
  } catch (e) {
    console.warn(`[BundleSync] Error caching bundle for ${colName}:`, e);
    setIdbBundle(companyId, colName, list || []);
    try {
      if (version !== null) {
        localStorage.setItem(`bundle_ver_${colName}_${companyId}`, String(version));
      }
    } catch (verErr) {}
  }
};

/**
 * Get local bundle version
 */
export const getLocalVersion = (companyId, colName) => {
  return Number(localStorage.getItem(`bundle_ver_${colName}_${companyId}`) || 0);
};

/**
 * Fetch a single bundle document from Firestore (supports chunked bundles transparently)
 */
export const fetchBundle = async (companyId, colName) => {
  if (!companyId || !db) return [];
  try {
    const bundleDocRef = doc(db, 'companies', companyId, 'bundles', colName);
    const snap = await getDoc(bundleDocRef);

    if (snap.exists()) {
      const data = snap.data();
      let rawList = [];

      // Support transparent multi-document chunking for large datasets (> 1MB)
      if (data.isChunked && data.chunkCount > 0) {
        const chunkPromises = [];
        for (let i = 0; i < data.chunkCount; i++) {
          const chunkRef = doc(db, 'companies', companyId, 'bundles', `${colName}_chunk_${i}`);
          chunkPromises.push(getDoc(chunkRef));
        }
        const chunkSnaps = await Promise.all(chunkPromises);
        rawList = chunkSnaps.flatMap(s => (s.exists() && s.data()?.list) ? s.data().list : []);
      } else {
        rawList = data.list || data.items || [];
      }

      let list = filterBundleListForCompany(companyId, colName, rawList);

      // Auto-heal bundle document if duplicates were detected and pruned (non-chunked only)
      if (!data.isChunked && rawList.length > list.length) {
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
      // automatically reconcile and recover from the collection (only once per empty state)!
      const reconciledFlagKey = `bundle_reconciled_${colName}_${companyId}`;
      if (data.isReset) {
        try {
          localStorage.setItem(reconciledFlagKey, 'true');
        } catch (e) {}
      }
      if (
        !data.isReset &&
        list.length === 0 &&
        localStorage.getItem(reconciledFlagKey) !== 'true' &&
        (colName === 'partners' || colName === 'products' || colName === 'warehouses' || colName === 'staffList')
      ) {
        try {
          localStorage.setItem(reconciledFlagKey, 'true');
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
      } else if (list.length > 0) {
        localStorage.removeItem(reconciledFlagKey);
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
 * Save whole list as bundle in a single write operation (Write count: 1 or chunks)
 * Automatically chunks datasets that exceed ~700KB (Firestore 1MB limit safe).
 */
export const saveBundle = async (companyId, colName, list) => {
  if (!companyId || !db) return;
  try {
    const cleanList = (list || []).map(item => {
      const clean = { ...item };
      delete clean._docId;
      return clean;
    });

    const nextVer = Math.max(getLocalVersion(companyId, colName) + 1, Math.floor(Date.now() / 1000));
    const nowIso = new Date().toISOString();
    const bundleDocRef = doc(db, 'companies', companyId, 'bundles', colName);
    const jsonStr = JSON.stringify(cleanList);

    // If total payload exceeds 700KB, split into 500-item chunks to strictly respect Firestore 1MB doc limit
    if (jsonStr.length > 700000) {
      const CHUNK_SIZE = 500;
      const chunks = [];
      for (let i = 0; i < cleanList.length; i += CHUNK_SIZE) {
        chunks.push(cleanList.slice(i, i + CHUNK_SIZE));
      }

      // Read existing chunkCount if any to prune surplus chunks
      let oldChunkCount = 0;
      try {
        const oldSnap = await getDoc(bundleDocRef);
        if (oldSnap.exists() && oldSnap.data()?.isChunked) {
          oldChunkCount = Number(oldSnap.data().chunkCount) || 0;
        }
      } catch (e) {}

      // Write chunk documents in parallel
      await Promise.all(chunks.map((chunkList, idx) => {
        const chunkRef = doc(db, 'companies', companyId, 'bundles', `${colName}_chunk_${idx}`);
        return setDoc(chunkRef, { list: chunkList, updatedAt: nowIso });
      }));

      // Delete surplus chunks if new chunk count is smaller
      if (oldChunkCount > chunks.length) {
        const delPromises = [];
        for (let i = chunks.length; i < oldChunkCount; i++) {
          delPromises.push(deleteDoc(doc(db, 'companies', companyId, 'bundles', `${colName}_chunk_${i}`)));
        }
        await Promise.all(delPromises).catch(console.warn);
      }

      // Write master index document
      await setDoc(bundleDocRef, {
        isChunked: true,
        isReset: false,
        chunkCount: chunks.length,
        chunkSize: CHUNK_SIZE,
        totalItems: cleanList.length,
        version: nextVer,
        updatedAt: nowIso
      });
    } else {
      // 1. Write Single Bundle Document
      await setDoc(bundleDocRef, {
        list: cleanList,
        isChunked: false,
        chunkCount: 0,
        isReset: cleanList.length === 0,
        version: nextVer,
        updatedAt: nowIso
      });
    }

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
export const syncBundlesOnce = async (companyId, onBundleChange, targetCollections = BUNDLE_COLLECTIONS, onlyIfOutdated = false) => {
  if (!companyId || !db) return;
  try {
    const syncStateRef = doc(db, 'companies', companyId, 'metadata', 'syncState');
    const snapshot = await getDoc(syncStateRef);

    if (!snapshot.exists()) {
      if (onlyIfOutdated) return;
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
        if (onlyIfOutdated && localVer > 0) continue;
        const list = await fetchBundle(companyId, colName);
        if (onBundleChange) onBundleChange(colName, list);
        continue;
      }

      const serverVer = Number(serverColState.version || 0);

      // If memory state is already hydrated and server version hasn't changed, skip re-parsing local storage / IDB
      if (onlyIfOutdated && localVer >= serverVer && localVer > 0) {
        continue;
      }

      // Special handling for large collections (e.g. salesInvoices) stored in IndexedDB:
      if (colName === 'salesInvoices') {
        const idbList = await getIdbBundle(companyId, colName);
        if (idbList && Array.isArray(idbList) && idbList.length > 0 && localVer >= serverVer) {
          console.log(`[BundleSync] ⚡ Loaded ${idbList.length} items from IndexedDB for [${colName}]`);
          if (onBundleChange) onBundleChange(colName, idbList);
          continue;
        } else {
          console.log(`[BundleSync] 🔄 Syncing chunked bundle from Firestore for [${colName}] (Local v${localVer} -> Server v${serverVer})...`);
          const updatedList = await fetchBundle(companyId, colName);
          if (onBundleChange) onBundleChange(colName, updatedList);
          continue;
        }
      }

      // Only fetch from Firestore if local version is outdated or not present!
      if (serverVer > localVer || localVer === 0) {
        console.log(`[BundleSync] 🔄 Syncing outdated bundle [${colName}] (Local v${localVer} -> Server v${serverVer})`);
        const updatedList = await fetchBundle(companyId, colName);
        if (onBundleChange) onBundleChange(colName, updatedList);
      } else {
        const localList = getLocalBundle(companyId, colName);
        if (localList !== null && onBundleChange) {
          const reconciledFlagKey = `bundle_reconciled_${colName}_${companyId}`;
          if (
            localList.length === 0 &&
            localStorage.getItem(reconciledFlagKey) !== 'true'
          ) {
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
 * Completely clear all bundle documents, chunk documents, IndexedDB, and syncState from Firestore and localStorage
 * Zero-read fast batch execution (under 0.5s)
 */
export const clearAllBundles = async (companyId, preservedStaffList = []) => {
  if (!companyId || !db) return;
  try {
    await clearAllIdbBundles();

    const allCols = Array.from(new Set([...BUNDLE_COLLECTIONS, 'quotations', 'categories', 'scheduleTypes', 'staffZones', 'staffJobTitles']));
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();
    const resetVer = Math.floor(Date.now() / 1000);
    const syncStatePayload = { lastResetAt: nowIso };

    // 1. Delete chunk documents directly without downloading them via getDocs (fast 0-read delete)
    const chunkableCols = ['salesInvoices', 'purchaseInvoices', 'products', 'partners', 'salesOrders', 'purchaseOrders', 'inventoryTransferHistory', 'actionLogs'];
    chunkableCols.forEach(cName => {
      for (let i = 0; i < 25; i++) {
        batch.delete(doc(db, 'companies', companyId, 'bundles', `${cName}_chunk_${i}`));
      }
    });

    // 2. Overwrite all bundle documents with explicit empty reset bundles (prevents legacy fallback resurrection!)
    allCols.forEach(colName => {
      const bundleDocRef = doc(db, 'companies', companyId, 'bundles', colName);
      const resetList = colName === 'staffList' ? preservedStaffList : [];
      batch.set(bundleDocRef, {
        list: resetList,
        isChunked: false,
        chunkCount: 0,
        totalItems: resetList.length,
        isReset: true,
        version: resetVer,
        updatedAt: nowIso
      });
      syncStatePayload[colName] = { version: resetVer, updatedAt: nowIso, isReset: true };
      try {
        removeIdbBundle(companyId, colName);
        localStorage.setItem(`bundle_${colName}_${companyId}`, JSON.stringify(resetList));
        localStorage.setItem(`${colName}_${companyId}`, JSON.stringify(resetList));
        localStorage.setItem(`bundle_ver_${colName}_${companyId}`, String(resetVer));
        localStorage.setItem(`bundle_reconciled_${colName}_${companyId}`, 'true');
      } catch (e) {}
    });

    const syncStateRef = doc(db, 'companies', companyId, 'metadata', 'syncState');
    batch.set(syncStateRef, syncStatePayload);
    await batch.commit();
    console.log(`[BundleSync] 🧹 All bundles, chunks, IndexedDB, and syncState completely reset for ${companyId}`);
  } catch (err) {
    console.warn('[BundleSync] Error clearing all bundles:', err);
  }
};
