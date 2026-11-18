// A narrow compatibility boundary. Business stock/invoice algorithms remain untouched.
import * as raw from 'firebase/firestore';
import { callAuth } from './client';
const safeSettings=new Set(['systemSettings','staffZones','staffJobTitles','recentActivity','favoriteMenus','dashboardConfig']);
function bridged(ref){
 const p=ref?.path?.split('/');
 if(!p||p[0]!=='companies')return null;
 if(p.length===2||['staffList','partners','bundles','metadata'].includes(p[2])||(p[2]==='settings'&&safeSettings.has(p[3])))return {companyId:p[1],path:ref.path};
 return null;
}
function snapshot(ref,value){
 return {id:value.id||ref.id,ref,metadata:{fromCache:false,hasPendingWrites:false},exists:()=>value.exists!==false,data:()=>value.data,
 get:field=>String(field).split('.').reduce((v,k)=>v?.[k],value.data)};
}
export async function getDoc(ref){const target=bridged(ref);if(!target)return raw.getDoc(ref);return snapshot(ref,await callAuth('tenantRead',target));}
export async function getDocs(ref){
 const target=bridged(ref);if(!target)return raw.getDocs(ref);
 if(ref.type!=='collection')throw new Error('보호된 직원·거래처 조회는 승인 관리 화면을 사용해 주세요.');
 const result=await callAuth('tenantRead',target),docs=result.docs.map(d=>snapshot(raw.doc(ref,d.id),{...d,exists:true}));
 return {docs,size:docs.length,empty:docs.length===0,metadata:{fromCache:false,hasPendingWrites:false},forEach:callback=>docs.forEach(callback)};
}
export async function setDoc(ref,data,options={}){const target=bridged(ref);if(!target)return raw.setDoc(ref,data,options);if(options.mergeFields)throw new Error('보호된 문서의 mergeFields는 지원하지 않습니다.');await callAuth('tenantWrite',{...target,operation:'set',data,merge:options.merge===true});}
export async function updateDoc(ref,data,...rest){const target=bridged(ref);if(!target)return raw.updateDoc(ref,data,...rest);if(rest.length||!data||typeof data!=='object')throw new Error('보호된 문서는 객체 형식으로 수정해 주세요.');await callAuth('tenantWrite',{...target,operation:'update',data});}
export async function deleteDoc(ref){if(bridged(ref))throw new Error('보호된 계정·번들 삭제는 승인된 서버 작업이 필요합니다.');return raw.deleteDoc(ref);}
