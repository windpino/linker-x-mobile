import { canReadCollection, canWriteCollection } from '../../functions/tenantPolicy';
import { clearAllIdbBundles } from '../utils/idbBundleCache';
let scope=null;
export function clearSessionScope(){scope=null;}
export async function prepareSessionScope(session){
 const permissions=Object.fromEntries(Object.entries(session.permissions||{}).sort(([a],[b])=>a.localeCompare(b)));
 const owner=JSON.stringify([session.authUid,session.companyId,session.authRole,permissions]);
 if(localStorage.getItem('authCacheOwner')!==owner){
  const cleared=await clearAllIdbBundles();
  if(!cleared && typeof indexedDB!=='undefined')throw new Error('이전 계정 캐시를 지우지 못했습니다. 브라우저 사이트 데이터를 확인해 주세요.');
  for(const key of Object.keys(localStorage))if(!key.startsWith('firebase:')&&!key.startsWith('dev_')&&!['system_cleaned_ver','app_theme'].includes(key))localStorage.removeItem(key);
  localStorage.setItem('authCacheOwner',owner);
 }
 scope={...session,role:session.authRole};
}
export const canReadBundle=(cid,col)=>scope?.companyId===cid&&canReadCollection(scope,col);
export const canWriteBundle=(cid,col)=>scope?.companyId===cid&&canWriteCollection(scope,col);
