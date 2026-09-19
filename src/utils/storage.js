/**
 * safeLocalStorage
 * iOS Safari Private Browsing, in-app browsers, or corrupted JSON strings
 * will never throw an unhandled exception or crash the app.
 */

export const safeGetItem = (key, fallback = null) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const value = window.localStorage.getItem(key);
    if (value === null || value === undefined || value === 'undefined' || value === 'null') {
      return fallback;
    }
    return value;
  } catch (err) {
    console.warn(`safeGetItem failed for key "${key}":`, err);
    return fallback;
  }
};

export const safeGetJson = (key, fallback = null) => {
  try {
    const raw = safeGetItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`safeGetJson failed for key "${key}":`, err);
    return fallback;
  }
};

export const safeSetItem = (key, value) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, stringValue);
    return true;
  } catch (err) {
    console.warn(`safeSetItem failed for key "${key}":`, err);
    return false;
  }
};

export const safeRemoveItem = (key) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`safeRemoveItem failed for key "${key}":`, err);
    return false;
  }
};
