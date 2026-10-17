import { db } from '../firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch 
} from 'firebase/firestore';

/**
 * Format bytes to readable string (e.g. 1.2 MB, 450 KB)
 */
export const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Extract summary statistics of ERP entities
 */
export const extractRecordCounts = (data) => {
  if (!data || typeof data !== 'object') return { total: 0 };
  const counts = {
    partners: Array.isArray(data.partners) ? data.partners.length : 0,
    products: Array.isArray(data.products) ? data.products.length : 0,
    salesInvoices: Array.isArray(data.salesInvoices) ? data.salesInvoices.length : 0,
    purchaseInvoices: Array.isArray(data.purchaseInvoices) ? data.purchaseInvoices.length : 0,
    salesOrders: Array.isArray(data.salesOrders) ? data.salesOrders.length : 0,
    purchaseOrders: Array.isArray(data.purchaseOrders) ? data.purchaseOrders.length : 0,
    quotations: Array.isArray(data.quotations) ? data.quotations.length : 0,
    inventoryTransfers: Array.isArray(data.inventoryTransferHistory) ? data.inventoryTransferHistory.length : 0,
    inventoryAdjustments: Array.isArray(data.inventoryAdjustments) ? data.inventoryAdjustments.length : 0,
    actionLogs: Array.isArray(data.actionLogs) ? data.actionLogs.length : 0,
    schedules: Array.isArray(data.schedules) ? data.schedules.length : 0,
    warehouses: Array.isArray(data.warehouses) ? data.warehouses.length : 0,
    accounts: Array.isArray(data.accounts) ? data.accounts.length : 0
  };
  const total = Object.values(counts).reduce((acc, c) => acc + c, 0);
  return { ...counts, total };
};

/**
 * Save full ERP backup to Firestore server
 * Automatically splits into subcollection chunks if payload exceeds 700KB to prevent 1MB document limit!
 */
export const saveServerBackup = async (companyId, backupData, options = {}) => {
  if (!companyId || !db) throw new Error('회원사 식별자(companyId)가 누락되었습니다.');
  if (!backupData || typeof backupData !== 'object') throw new Error('백업할 데이터가 올바르지 않습니다.');

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  const timeStr = now.toLocaleTimeString('ko-KR', { hour12: false });
  const backupId = `bk_${y}${m}${d}_${now.getTime()}`;

  const counts = extractRecordCounts(backupData);
  const jsonStr = JSON.stringify(backupData);
  const sizeBytes = new Blob([jsonStr]).size;
  const sizeFormatted = formatBytes(sizeBytes);

  const CHUNK_CHAR_LIMIT = 500000; // ~500KB per chunk
  const isChunked = jsonStr.length > 700000;

  const metadata = {
    id: backupId,
    title: options.title || `정기 서버 백업 (${todayStr} ${timeStr})`,
    memo: options.memo || '',
    createdAt: now.toISOString(),
    date: todayStr,
    time: timeStr,
    creator: options.creator || '관리자',
    creatorId: options.creatorId || 'admin',
    cycleType: options.cycleType || 'manual', // 'manual' | 'daily' | 'weekly' | 'monthly'
    recordCounts: counts,
    totalCount: counts.total,
    sizeBytes,
    sizeFormatted,
    isChunked,
    companyId
  };

  const backupDocRef = doc(db, 'companies', companyId, 'serverBackups', backupId);

  if (!isChunked) {
    // Small enough to store in single document
    await setDoc(backupDocRef, {
      ...metadata,
      data: backupData
    });
  } else {
    // Large document: store metadata in main doc, chunks in subcollection
    const totalChunks = Math.ceil(jsonStr.length / CHUNK_CHAR_LIMIT);
    await setDoc(backupDocRef, {
      ...metadata,
      chunkCount: totalChunks,
      data: null
    });

    const batch = writeBatch(db);
    for (let i = 0; i < totalChunks; i++) {
      const chunkStr = jsonStr.slice(i * CHUNK_CHAR_LIMIT, (i + 1) * CHUNK_CHAR_LIMIT);
      const chunkRef = doc(db, 'companies', companyId, 'serverBackups', backupId, 'chunks', String(i));
      batch.set(chunkRef, {
        chunkIndex: i,
        content: chunkStr
      });
    }
    await batch.commit();
  }

  // Update backup settings last backup timestamp
  try {
    await setDoc(doc(db, 'companies', companyId, 'settings', 'backupSettings'), {
      lastBackupDate: todayStr,
      lastBackupTime: timeStr,
      lastBackupId: backupId,
      lastBackupSize: sizeFormatted
    }, { merge: true });
  } catch (e) {}

  return {
    ...metadata,
    success: true
  };
};

/**
 * Fetch list of all server backups (metadata only for speed)
 */
export const fetchServerBackups = async (companyId) => {
  if (!companyId || !db) return [];
  try {
    const colRef = collection(db, 'companies', companyId, 'serverBackups');
    const snap = await getDocs(colRef);
    if (snap.empty) return [];

    const list = snap.docs.map(docSnap => {
      const d = docSnap.data();
      return {
        id: d.id || docSnap.id,
        title: d.title || `백업 (${d.date || ''})`,
        memo: d.memo || '',
        createdAt: d.createdAt || '',
        date: d.date || '',
        time: d.time || '',
        creator: d.creator || '관리자',
        creatorId: d.creatorId || '',
        cycleType: d.cycleType || 'manual',
        recordCounts: d.recordCounts || {},
        totalCount: d.totalCount || 0,
        sizeBytes: d.sizeBytes || 0,
        sizeFormatted: d.sizeFormatted || '0 B',
        isChunked: Boolean(d.isChunked),
        chunkCount: d.chunkCount || 0
      };
    });

    // Sort descending by createdAt
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return list;
  } catch (err) {
    console.error('[ServerBackup] Fetch list error:', err);
    return [];
  }
};

/**
 * Load full backup payload from server (recombining chunks if needed)
 */
export const loadServerBackupData = async (companyId, backupId) => {
  if (!companyId || !backupId || !db) throw new Error('백업 식별자가 누락되었습니다.');

  const backupDocRef = doc(db, 'companies', companyId, 'serverBackups', backupId);
  const snap = await getDoc(backupDocRef);
  if (!snap.exists()) throw new Error('해당 백업 파일을 서버에서 찾을 수 없습니다.');

  const meta = snap.data();
  if (!meta.isChunked && meta.data) {
    return meta.data;
  }

  // If chunked, fetch and reconstruct chunks
  const chunksColRef = collection(db, 'companies', companyId, 'serverBackups', backupId, 'chunks');
  const chunksSnap = await getDocs(chunksColRef);
  if (chunksSnap.empty) throw new Error('백업 데이터 청크를 불러올 수 없습니다.');

  const chunks = chunksSnap.docs.map(d => d.data());
  chunks.sort((a, b) => Number(a.chunkIndex) - Number(b.chunkIndex));

  const fullJsonStr = chunks.map(c => c.content || '').join('');
  return JSON.parse(fullJsonStr);
};

/**
 * Delete a server backup
 */
export const deleteServerBackup = async (companyId, backupId) => {
  if (!companyId || !backupId || !db) return false;

  const backupDocRef = doc(db, 'companies', companyId, 'serverBackups', backupId);
  const snap = await getDoc(backupDocRef);
  if (!snap.exists()) return true;

  const meta = snap.data();
  if (meta.isChunked) {
    try {
      const chunksSnap = await getDocs(collection(db, 'companies', companyId, 'serverBackups', backupId, 'chunks'));
      const batch = writeBatch(db);
      chunksSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      console.warn('[ServerBackup] Delete chunks error:', e);
    }
  }

  await deleteDoc(backupDocRef);
  return true;
};

/**
 * Get company auto-backup settings
 */
export const getBackupSettings = async (companyId) => {
  const defaultSettings = {
    autoBackupCycle: 'daily', // 'manual' | 'daily' | 'weekly' | 'monthly'
    lastAutoBackupDate: null,
    lastAutoBackupTime: null,
    keepDays: 90
  };

  if (!companyId || !db) return defaultSettings;

  try {
    const snap = await getDoc(doc(db, 'companies', companyId, 'settings', 'backupSettings'));
    if (snap.exists()) {
      return { ...defaultSettings, ...snap.data() };
    }
  } catch (e) {
    console.warn('[ServerBackup] getBackupSettings error:', e);
  }

  try {
    const local = localStorage.getItem(`backupSettings_${companyId}`);
    if (local) return { ...defaultSettings, ...JSON.parse(local) };
  } catch (e) {}

  return defaultSettings;
};

/**
 * Save company auto-backup settings
 */
export const saveBackupSettings = async (companyId, settings) => {
  if (!companyId || !db) return;
  try {
    await setDoc(doc(db, 'companies', companyId, 'settings', 'backupSettings'), settings, { merge: true });
    localStorage.setItem(`backupSettings_${companyId}`, JSON.stringify(settings));
  } catch (e) {
    console.error('[ServerBackup] saveBackupSettings error:', e);
    throw e;
  }
};

/**
 * Check if auto-backup is due and execute if required
 */
export const checkAndRunAutoBackup = async (companyId, fullData, currentUser) => {
  if (!companyId || !fullData || !currentUser) return null;

  try {
    const settings = await getBackupSettings(companyId);
    const cycle = settings.autoBackupCycle || 'daily';
    if (cycle === 'manual') return null;

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    const lastDate = settings.lastAutoBackupDate;

    let isDue = false;

    if (!lastDate) {
      isDue = true;
    } else if (cycle === 'daily') {
      isDue = todayStr !== lastDate;
    } else if (cycle === 'weekly') {
      const last = new Date(lastDate);
      const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      isDue = diffDays >= 7;
    } else if (cycle === 'monthly') {
      const lastMonth = lastDate.slice(0, 7);
      const currentMonth = `${y}-${m}`;
      isDue = currentMonth !== lastMonth;
    }

    if (isDue) {
      console.log(`[ServerBackup] 🚀 Automatic ${cycle} backup triggered for company ${companyId}`);
      const res = await saveServerBackup(companyId, fullData, {
        title: `[자동 정기 백업] ${todayStr} (${cycle === 'daily' ? '매일' : cycle === 'weekly' ? '매주' : '매월'})`,
        memo: '시스템 주기별 자동 백업',
        creator: '시스템 (자동백업)',
        creatorId: 'system',
        cycleType: cycle
      });

      await saveBackupSettings(companyId, {
        ...settings,
        lastAutoBackupDate: todayStr,
        lastAutoBackupTime: now.toLocaleTimeString('ko-KR', { hour12: false })
      });

      return res;
    }
  } catch (err) {
    console.warn('[ServerBackup] Auto backup check error:', err);
  }
  return null;
};
