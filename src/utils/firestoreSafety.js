import { 
  setDoc as rawSetDoc, 
  updateDoc as rawUpdateDoc, 
  deleteDoc as rawDeleteDoc 
} from 'firebase/firestore';

/**
 * LINKER-X Firestore Safety Guard & Circuit Breaker
 * 
 * 1. Sliding window rate-limiter (Max 120 writes / 60 sec per client)
 * 2. Automatic Debounce for rapid same-document writes (300ms)
 * 3. Prevents runaway infinite loops and billing storms
 */

class FirestoreGuard {
  constructor() {
    this.writeTimestamps = [];
    this.maxWritesPerMinute = 120; // 1분당 최대 쓰기 허용량
    this.isTripped = false;
    this.tripResetTimeout = null;
    this.pendingDebounces = new Map();
    this.totalWrites = 0;
    this.blockedWrites = 0;
  }

  // 1분 내 쓰기 횟수 확인 및 서킷 브레이커 체크
  _checkCircuitBreaker() {
    const now = Date.now();
    this.writeTimestamps = this.writeTimestamps.filter(t => now - t < 60000);

    if (this.writeTimestamps.length >= this.maxWritesPerMinute) {
      if (!this.isTripped) {
        this.isTripped = true;
        console.error(`🚨 [Firestore Guard] 비정상적인 연속 쓰기 감지 (${this.writeTimestamps.length}회/분)! 서킷 브레이커가 작동하여 쓰기 요청을 보호 차단합니다.`);
      }

      // 10초 후 서킷 브레이커 자동 해제 검토
      if (this.tripResetTimeout) clearTimeout(this.tripResetTimeout);
      this.tripResetTimeout = setTimeout(() => {
        this.isTripped = false;
        console.log('✅ [Firestore Guard] 서킷 브레이커가 정상 모드로 복구되었습니다.');
      }, 10000);

      return false; // 차단
    }

    return true; // 허용
  }

  _recordWrite() {
    this.writeTimestamps.push(Date.now());
    this.totalWrites++;
  }

  getMetrics() {
    const now = Date.now();
    const recentWrites = this.writeTimestamps.filter(t => now - t < 60000).length;
    return {
      recentWritesLastMinute: recentWrites,
      totalWrites: this.totalWrites,
      blockedWrites: this.blockedWrites,
      isTripped: this.isTripped,
      maxWritesPerMinute: this.maxWritesPerMinute
    };
  }
}

export const firestoreGuard = new FirestoreGuard();

if (typeof window !== 'undefined') {
  window.__FIRESTORE_GUARD__ = firestoreGuard;
}

/**
 * 안전한 setDoc 래퍼 (서킷 브레이커 + 디바운싱 지원)
 */
export async function safeSetDoc(docRef, data, options = {}, debounceMs = 0) {
  if (!docRef || !docRef.path) {
    console.warn('[Firestore Guard] Invalid docRef passed to safeSetDoc');
    return;
  }

  const docPath = docRef.path;

  // 디바운스 요청이 있는 경우 (빠른 연속 상태 저장 시 유용)
  if (debounceMs > 0) {
    return new Promise((resolve, reject) => {
      if (firestoreGuard.pendingDebounces.has(docPath)) {
        clearTimeout(firestoreGuard.pendingDebounces.get(docPath).timer);
      }

      const timer = setTimeout(async () => {
        firestoreGuard.pendingDebounces.delete(docPath);
        try {
          const res = await safeSetDoc(docRef, data, options, 0);
          resolve(res);
        } catch (err) {
          reject(err);
        }
      }, debounceMs);

      firestoreGuard.pendingDebounces.set(docPath, { timer });
    });
  }

  if (!firestoreGuard._checkCircuitBreaker()) {
    firestoreGuard.blockedWrites++;
    console.warn(`[Firestore Guard] 쓰기 차단됨 (doc: ${docPath})`);
    return Promise.resolve(null);
  }

  try {
    firestoreGuard._recordWrite();
    return await rawSetDoc(docRef, data, options);
  } catch (error) {
    console.error(`[Firestore Guard] safeSetDoc failed for ${docPath}:`, error);
    throw error;
  }
}

/**
 * 안전한 updateDoc 래퍼
 */
export async function safeUpdateDoc(docRef, data) {
  if (!docRef || !docRef.path) return;

  const docPath = docRef.path;
  if (!firestoreGuard._checkCircuitBreaker()) {
    firestoreGuard.blockedWrites++;
    console.warn(`[Firestore Guard] 업데이트 차단됨 (doc: ${docPath})`);
    return Promise.resolve(null);
  }

  try {
    firestoreGuard._recordWrite();
    return await rawUpdateDoc(docRef, data);
  } catch (error) {
    console.error(`[Firestore Guard] safeUpdateDoc failed for ${docPath}:`, error);
    throw error;
  }
}

/**
 * 안전한 deleteDoc 래퍼
 */
export async function safeDeleteDoc(docRef) {
  if (!docRef || !docRef.path) return;

  const docPath = docRef.path;
  if (!firestoreGuard._checkCircuitBreaker()) {
    firestoreGuard.blockedWrites++;
    console.warn(`[Firestore Guard] 삭제 차단됨 (doc: ${docPath})`);
    return Promise.resolve(null);
  }

  try {
    firestoreGuard._recordWrite();
    return await rawDeleteDoc(docRef);
  } catch (error) {
    console.error(`[Firestore Guard] safeDeleteDoc failed for ${docPath}:`, error);
    throw error;
  }
}
