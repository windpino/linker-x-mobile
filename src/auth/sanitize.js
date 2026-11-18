// Business profiles and caches must never carry reusable authentication secrets.
const secret = /password|passwd|^pwd$|token|credential|saved.*pw|agencyPassword/i;
export function withoutSecrets(value) {
  if (Array.isArray(value)) return value.map(withoutSecrets);
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !secret.test(key)).map(([key, val]) => [key, withoutSecrets(val)]));
  }
  return value;
}
export function clearLegacyCredentials(storage) {
  if (!storage) return;
  for (const key of [...Array(storage.length)].map((_, i) => storage.key(i))) {
    if (/password|saved.*pw|credential/i.test(key) || ['currentUser','savedAgency','autoLogin','autoLoginUser','autoLoginAgency'].includes(key)) storage.removeItem(key);
    else {
      const raw = storage.getItem(key);
      try { const parsed = JSON.parse(raw); if (parsed && typeof parsed === 'object') storage.setItem(key, JSON.stringify(withoutSecrets(parsed))); } catch { /* non-JSON preferences */ }
    }
  }
}
