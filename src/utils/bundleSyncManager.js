import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

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
  'expenses',
  'inventoryAdjustments',
  'inventoryTransferHistory',
  'actionLogs'
];

/**
 * Get cached bundle from localStorage
 */
export const getLocalBundle = (companyId, colName) => {
  try {
    const raw = localStorage.getItem(`bundle_${colName}_${companyId}`) || localStorage.getItem(`${colName}_${companyId}`) || localStorage.getItem(colName);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed.list || []);
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
      const list = data.list || [];
      const version = Number(data.version || 1);
      setLocalBundle(companyId, colName, list, version);
      return list;
    }

    // Fallback: Check legacy collection if bundle does not exist yet
    const legacyColRef = collection(db, 'companies', companyId, colName);
    const legacySnap = await getDocs(legacyColRef);

    if (!legacySnap.empty) {
      const list = legacySnap.docs.map(d => ({ ...d.data(), _docId: d.id }));
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
        const localList = getLocalBundle(companyId, colName);
        if (!localList || localList.length === 0) {
          const list = await fetchBundle(companyId, colName);
          if (onBundleChange) onBundleChange(colName, list);
        }
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
        if (localList && onBundleChange) {
          onBundleChange(colName, localList);
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
