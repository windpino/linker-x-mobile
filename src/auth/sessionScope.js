import { canReadCollection, canWriteCollection } from '../../functions/tenantPolicy.js';
import { clearAllIdbBundles } from '../utils/idbBundleCache.js';

let scope = null;
export function clearSessionScope() { scope = null; }

export function getEffectiveScope() {
  if (scope) return scope;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('currentUser') : null;
    if (raw) {
      const u = JSON.parse(raw);
      if (u && (u.companyId || u.role)) {
        const role = u.authRole || (u.role === 'admin' ? 'tenant_admin' : u.role);
        return {
          ...u,
          role,
          authRole: role,
          status: u.status || 'active'
        };
      }
    }
  } catch {}
  return null;
}

export async function prepareSessionScope(session) {
  const permissions = Object.fromEntries(Object.entries(session.permissions || {}).sort(([a],[b])=>a.localeCompare(b)));
  const owner = JSON.stringify([session.authUid || session.uid, session.companyId, session.authRole || session.role, permissions]);
  const prevOwner = localStorage.getItem('authCacheOwner');

  if (prevOwner !== owner) {
    let isDifferentCompany = false;
    try {
      const prevArr = prevOwner ? JSON.parse(prevOwner) : null;
      if (prevArr && prevArr[1] && prevArr[1] !== session.companyId) {
        isDifferentCompany = true;
      }
    } catch {}

    if (isDifferentCompany) {
      const cleared = await clearAllIdbBundles();
      if (!cleared && typeof indexedDB !== 'undefined') console.warn('이전 계정 캐시 지우기 경고');
      for (const key of Object.keys(localStorage)) {
        if (!key.startsWith('firebase:') && !key.startsWith('dev_') && !['system_cleaned_ver', 'app_theme'].includes(key) && !key.endsWith(`_${session.companyId}`)) {
          localStorage.removeItem(key);
        }
      }
    }
    localStorage.setItem('authCacheOwner', owner);
  }
  scope = { ...session, role: session.authRole || session.role, status: session.status || 'active' };
}

export const canReadBundle = (cid, col) => {
  const s = getEffectiveScope();
  if (!s) return false;
  return s.companyId === cid && canReadCollection(s, col);
};

export const canWriteBundle = (cid, col) => {
  const s = getEffectiveScope();
  if (!s) return false;
  return s.companyId === cid && canWriteCollection(s, col);
};
