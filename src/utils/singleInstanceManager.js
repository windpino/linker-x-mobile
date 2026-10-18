/**
 * singleInstanceManager.js
 * Linker-X Single Instance Enforcement & Multi-Window Coordination
 *
 * Ensures Linker-X runs in only one single window or tab at a time.
 * If another window is opened, it alerts the user with:
 * "이미 실행되어 있습니다" and brings focus to the existing window.
 */

const CHANNEL_NAME = 'linkerx_single_instance_bus';
const LOCK_NAME = 'linkerx_single_window_lock';
const STORAGE_KEY = 'linkerx_active_instance';

class SingleInstanceManager {
  constructor() {
    this.instanceId = 'inst_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.isPrimary = false;
    this.isDuplicate = false;
    this.existingInfo = null;
    this.channel = null;
    this.listeners = new Set();
    this.releaseLockPromise = null;
    this.heartbeatTimer = null;
    this.isInitialized = false;

    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  notify() {
    const state = {
      isPrimary: this.isPrimary,
      isDuplicate: this.isDuplicate,
      existingInfo: this.existingInfo,
      instanceId: this.instanceId
    };
    this.listeners.forEach(fn => {
      try { fn(state); } catch (e) { console.error(e); }
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener({
      isPrimary: this.isPrimary,
      isDuplicate: this.isDuplicate,
      existingInfo: this.existingInfo,
      instanceId: this.instanceId
    });
    return () => this.listeners.delete(listener);
  }

  getCurrentUserInfo() {
    try {
      const uStr = localStorage.getItem('currentUser');
      if (uStr && uStr !== 'undefined' && uStr !== 'null') {
        const u = JSON.parse(uStr);
        return {
          userName: u.name || u.userId || '로그인 사용자',
          companyId: u.companyId || '',
          companyName: u.companyName || ''
        };
      }
    } catch (e) {}
    return null;
  }

  updateStorageInfo() {
    try {
      const userInfo = this.getCurrentUserInfo();
      const info = {
        id: this.instanceId,
        timestamp: Date.now(),
        user: userInfo,
        url: window.location.href,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    } catch (e) {}
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Setup BroadcastChannel for cross-window messaging
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => this.handleMessage(event.data);
      } catch (e) {
        console.warn('[SingleInstance] BroadcastChannel error:', e);
      }
    }

    // 2. Setup storage event listener as fallback message bus
    window.addEventListener('storage', (e) => {
      if (e.key === 'linkerx_single_instance_msg' && e.newValue) {
        try {
          const msg = JSON.parse(e.newValue);
          if (msg && (msg.targetId === this.instanceId || msg.broadcast || msg.target === 'primary')) {
            this.handleMessage(msg);
          }
        } catch (err) {}
      }
    });

    // 3. Clean up on window unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // 4. Attempt to acquire the lock
    this.acquireLock();
  }

  handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return;

    // When a new window pings asking who is active:
    if (msg.type === 'PING_WHO_IS_ACTIVE') {
      if (this.isPrimary) {
        // Send back that this window is primary and active
        this.postMessage({
          type: 'PONG_I_AM_ACTIVE',
          ownerId: this.instanceId,
          info: this.getCurrentUserInfo()
        });
      }
    }

    // When receiving response that an active instance already exists:
    if (msg.type === 'PONG_I_AM_ACTIVE') {
      if (!this.isPrimary && msg.ownerId !== this.instanceId) {
        this.isDuplicate = true;
        this.existingInfo = msg.info || this.getStoredInfo()?.user;
        this.notify();
      }
    }

    // When requested to bring this window to front:
    if (msg.type === 'FOCUS_EXISTING_WINDOW') {
      if (this.isPrimary) {
        try {
          window.focus();
        } catch (e) {}
        const originalTitle = document.title;
        document.title = '🔔 링커엑스가 이미 실행 중입니다';
        setTimeout(() => {
          document.title = originalTitle;
        }, 4000);
      }
    }

    // When user in duplicate window clicked "현재 창에서 계속 실행" (Takeover):
    if (msg.type === 'FORCE_TAKEOVER') {
      if (this.isPrimary && msg.newOwnerId !== this.instanceId) {
        console.log('[SingleInstance] Yielding lock to new window:', msg.newOwnerId);
        this.yieldLock();
      }
    }

    // When active instance closed:
    if (msg.type === 'INSTANCE_CLOSED') {
      if (this.isDuplicate) {
        // Attempt to claim primary lock now!
        this.acquireLock();
      }
    }
  }

  postMessage(data) {
    if (this.channel) {
      try {
        this.channel.postMessage(data);
      } catch (e) {}
    }
    try {
      localStorage.setItem('linkerx_single_instance_msg', JSON.stringify({ ...data, _ts: Date.now() }));
    } catch (e) {}
  }

  getStoredInfo() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  async acquireLock() {
    // Check if navigator.locks is supported
    if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
      try {
        navigator.locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
          if (!lock) {
            // Lock held by another window!
            this.isPrimary = false;
            this.isDuplicate = true;
            this.existingInfo = this.getStoredInfo()?.user || this.getCurrentUserInfo();
            this.notify();

            // Ping existing window to acknowledge and bring to front
            this.postMessage({ type: 'PING_WHO_IS_ACTIVE', senderId: this.instanceId });
            return;
          }

          // Lock acquired! This window is Primary!
          this.isPrimary = true;
          this.isDuplicate = false;
          this.existingInfo = null;
          this.updateStorageInfo();
          this.startHeartbeat();
          this.notify();

          // Keep lock held until releaseLockPromise resolves
          await new Promise((resolve) => {
            this.releaseLockPromise = resolve;
          });

          // After lock released
          this.isPrimary = false;
          this.stopHeartbeat();
        }).catch(err => {
          console.warn('[SingleInstance] Lock request error:', err);
          this.fallbackLockCheck();
        });
      } catch (e) {
        this.fallbackLockCheck();
      }
    } else {
      this.fallbackLockCheck();
    }
  }

  fallbackLockCheck() {
    // Fallback using localStorage timestamp
    const stored = this.getStoredInfo();
    const now = Date.now();
    if (stored && stored.id !== this.instanceId && (now - (stored.timestamp || 0)) < 4000) {
      // Active window exists
      this.isPrimary = false;
      this.isDuplicate = true;
      this.existingInfo = stored.user || this.getCurrentUserInfo();
      this.notify();
      this.postMessage({ type: 'PING_WHO_IS_ACTIVE', senderId: this.instanceId });
    } else {
      // We can be primary
      this.isPrimary = true;
      this.isDuplicate = false;
      this.existingInfo = null;
      this.updateStorageInfo();
      this.startHeartbeat();
      this.notify();
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isPrimary) {
        this.updateStorageInfo();
      }
    }, 2000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  yieldLock() {
    this.isPrimary = false;
    this.isDuplicate = true;
    this.stopHeartbeat();
    if (this.releaseLockPromise) {
      this.releaseLockPromise();
      this.releaseLockPromise = null;
    }
    this.notify();
  }

  focusExistingWindow() {
    this.postMessage({ type: 'FOCUS_EXISTING_WINDOW', target: 'primary' });
    try {
      window.close();
    } catch (e) {}
  }

  takeoverToThisWindow() {
    // Notify the other window to yield
    this.postMessage({ type: 'FORCE_TAKEOVER', newOwnerId: this.instanceId });
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    setTimeout(() => {
      this.acquireLock();
    }, 250);
  }

  cleanup() {
    this.stopHeartbeat();
    if (this.isPrimary) {
      try {
        const stored = this.getStoredInfo();
        if (stored && stored.id === this.instanceId) {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {}
      this.postMessage({ type: 'INSTANCE_CLOSED', closedId: this.instanceId });
    }
    if (this.releaseLockPromise) {
      this.releaseLockPromise();
    }
    if (this.channel) {
      try { this.channel.close(); } catch (e) {}
    }
  }
}

// Global Singleton
export const singleInstanceManager = new SingleInstanceManager();
