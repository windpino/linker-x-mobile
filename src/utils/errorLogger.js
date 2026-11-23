import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  writeBatch, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';

// In-memory throttling cache to prevent duplicate spam within 10 seconds
const recentErrors = new Map();

/**
 * Get current context info helper
 */
const getCurrentContext = () => {
  let companyName = '링커엑스';
  let companyId = 'system';
  let userName = '시스템';

  try {
    const savedUser = localStorage.getItem('currentUser') || localStorage.getItem('activeUser');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      companyName = parsed.companyName || parsed.company || companyName;
      companyId = parsed.companyId || companyId;
      userName = parsed.name || parsed.userName || userName;
    }
    const savedComp = localStorage.getItem('currentCompanyId');
    if (savedComp) companyId = savedComp;
    const savedCompName = localStorage.getItem('currentCompanyName');
    if (savedCompName) companyName = savedCompName;
  } catch (e) {}

  return { companyName, companyId, userName };
};

/**
 * Log error to Firestore 'error_logs' collection
 * Format: [회사명, 에러내용, 발생시간] + [에러유형, 사용자, 경로]
 */
export const logErrorToFirestore = async (errorData = {}) => {
  if (!db || typeof db.collection !== 'undefined') {
    // If db is not valid or Firestore is in mock state
  }

  try {
    const ctx = getCurrentContext();
    const finalCompanyName = errorData.companyName || ctx.companyName || '미확인 회사';
    const finalCompanyId = errorData.companyId || ctx.companyId || 'unknown';
    const finalUserName = errorData.userName || ctx.userName || '알 수 없음';
    const errorType = errorData.errorType || errorData.type || '런타임에러';
    const errorMessage = typeof errorData.errorMessage === 'string' 
      ? errorData.errorMessage 
      : (errorData.error?.message || String(errorData.error || errorData.message || '알 수 없는 오류'));

    if (!errorMessage || errorMessage.trim() === '') return null;

    // Check throttling key (companyId + errorType + errorMessage)
    const throttleKey = `${finalCompanyId}_${errorType}_${errorMessage.slice(0, 100)}`;
    const now = Date.now();
    const lastLogged = recentErrors.get(throttleKey);
    if (lastLogged && now - lastLogged < 8000) {
      // Throttled duplicate within 8s
      return null;
    }
    recentErrors.set(throttleKey, now);

    const nowObj = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formattedTime = `${nowObj.getFullYear()}-${pad(nowObj.getMonth() + 1)}-${pad(nowObj.getDate())} ${pad(nowObj.getHours())}:${pad(nowObj.getMinutes())}:${pad(nowObj.getSeconds())}`;

    const logPayload = {
      companyName: finalCompanyName,
      companyId: finalCompanyId,
      errorMessage: errorMessage,
      errorType: errorType, // '권한위반' | '런타임에러' | '네트워크오류' | '전표처리' | '기타'
      userName: finalUserName,
      path: errorData.path || (typeof window !== 'undefined' ? window.location.pathname : ''),
      stack: errorData.error?.stack || errorData.stack || '',
      details: errorData.details || null,
      createdAt: formattedTime,
      timestamp: now,
      resolved: false
    };

    const docRef = await addDoc(collection(db, 'error_logs'), logPayload);
    return docRef.id;
  } catch (err) {
    // Fail silently so logging error never crashes the ERP app
    console.warn('[ErrorLogger] Failed to write error_logs to Firestore:', err?.message || err);
    return null;
  }
};

/**
 * Log permission violation specifically
 */
export const logPermissionViolation = async ({
  companyName,
  companyId,
  action = '권한 제한 기능 실행 시도',
  reason = '접근 권한이 없는 작업입니다.',
  userName
} = {}) => {
  return logErrorToFirestore({
    companyName,
    companyId,
    userName,
    errorType: '권한위반',
    errorMessage: `[권한위반] ${action}: ${reason}`,
    details: { action, reason }
  });
};

/**
 * Initialize global uncaught error listeners (call once at app root)
 */
let isGlobalInitialized = false;
export const initGlobalErrorLogging = () => {
  if (isGlobalInitialized || typeof window === 'undefined') return;
  isGlobalInitialized = true;

  window.addEventListener('error', (event) => {
    // Ignore benign cross-origin script error or resize-observer loop
    if (event.message?.includes('ResizeObserver') || event.message?.includes('Script error')) {
      return;
    }
    logErrorToFirestore({
      errorType: '런타임에러',
      errorMessage: event.message || 'Window Uncaught Error',
      error: event.error,
      path: window.location.pathname
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || 'Unhandled Promise Rejection');
    if (msg.includes('ResizeObserver') || msg.includes('canceled') || msg.includes('AbortError')) {
      return;
    }
    logErrorToFirestore({
      errorType: '비동기오류',
      errorMessage: msg,
      error: reason,
      path: window.location.pathname
    });
  });
};

/**
 * Fetch latest error logs for SuperAdmin
 */
export const fetchErrorLogs = async (limitCount = 100) => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'error_logs'), 
      orderBy('timestamp', 'desc'), 
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('[ErrorLogger] fetchErrorLogs error:', err);
    return [];
  }
};

/**
 * Real-time subscription to error logs for SuperAdmin
 */
export const subscribeErrorLogs = (callback, limitCount = 100) => {
  if (!db) return () => {};
  try {
    const q = query(
      collection(db, 'error_logs'), 
      orderBy('timestamp', 'desc'), 
      limit(limitCount)
    );
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(logs);
    }, (err) => {
      console.warn('[ErrorLogger] subscribeErrorLogs error:', err);
    });
  } catch (err) {
    console.warn('[ErrorLogger] subscribeErrorLogs setup error:', err);
    return () => {};
  }
};

/**
 * Delete a single error log
 */
export const deleteErrorLog = async (logId) => {
  if (!db || !logId) return false;
  try {
    await deleteDoc(doc(db, 'error_logs', logId));
    return true;
  } catch (err) {
    console.warn('[ErrorLogger] deleteErrorLog error:', err);
    return false;
  }
};

/**
 * Batch delete / clear all error logs
 */
export const clearAllErrorLogs = async (logIds = null) => {
  if (!db) return 0;
  try {
    let idsToDelete = logIds;
    if (!idsToDelete || idsToDelete.length === 0) {
      const snap = await getDocs(collection(db, 'error_logs'));
      idsToDelete = snap.docs.map(d => d.id);
    }

    if (idsToDelete.length === 0) return 0;

    for (let i = 0; i < idsToDelete.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = idsToDelete.slice(i, i + 400);
      chunk.forEach(id => {
        batch.delete(doc(db, 'error_logs', id));
      });
      await batch.commit();
    }

    return idsToDelete.length;
  } catch (err) {
    console.warn('[ErrorLogger] clearAllErrorLogs error:', err);
    return 0;
  }
};
