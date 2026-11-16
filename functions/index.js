import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
initializeApp();
const db = getFirestore();
const opts = { region: 'asia-northeast3', maxInstances: 5 };
const id = (v) => { if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(v)) throw new HttpsError('invalid-argument', '잘못된 식별자입니다.'); return v; };
async function identity(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  const account = await getAuth().getUser(req.auth.uid);
  if (account.disabled || !account.emailVerified || req.auth.token.email_verified !== true) throw new HttpsError('permission-denied', '이메일 인증이 필요합니다.');
  return account;
}
const membershipRef = (uid, cid) => db.doc(`authz/${uid}/companies/${cid}`);
const compoundId = (...parts) => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
const requestRef = (uid,cid) => db.doc(`signupRequests/${compoundId(uid,cid)}`);
const platformRef = (uid) => db.doc(`platformAccess/${uid}`);
function active(data) { return data?.status === 'active'; }
function sessionUser(uid, cid, membership, profile) {
  // Explicit allowlist: never return legacy password, role, permissions or flags.
  const safe = {};
  for (const key of ['id','userId','name','jobTitle','warehouse','phone','email','zone']) if (profile?.[key] !== undefined) safe[key] = profile[key];
  return { ...safe, id: safe.id || membership.legacyId, userId: safe.userId || membership.legacyId,
    authUid: uid, companyId: cid, legacyId: membership.legacyId, partnerId: membership.partnerId || null,
    role: ({ tenant_admin:'admin', tenant_staff:'staff', partner:'partner', platform_admin:'super_admin' })[membership.role],
    authRole: membership.role, permissions: membership.permissions || {}, status:'active',
    isPlatformAdmin: membership.role === 'platform_admin' };
}
export const authSession = onCall(opts, async req => {
  const account = await identity(req);
  const cid = id(req.data?.companyId);
  if (cid === 'linker_x_hq') {
    const p = (await platformRef(account.uid).get()).data();
    if (!active(p)) throw new HttpsError('permission-denied','플랫폼 관리자 승인이 필요합니다.');
    return sessionUser(account.uid,cid,{role:'platform_admin',legacyId:account.uid,permissions:{}},{name:account.displayName || '관리자'});
  }
  const [m,c] = await Promise.all([membershipRef(account.uid,cid).get(),db.doc(`companies/${cid}`).get()]);
  const membership = m.data();
  if (!active(membership) || !active(c.data()) || membership.companyId !== cid) throw new HttpsError('permission-denied','회사 소속 승인 또는 사용 상태를 확인해 주세요.');
  const kind = membership.role === 'partner' ? 'partners' : 'staffList';
  const profile = (await db.doc(`companies/${cid}/${kind}/${id(membership.legacyId)}`).get()).data();
  if (!profile) throw new HttpsError('failed-precondition','연결된 업무 계정이 없습니다.');
  return sessionUser(account.uid,cid,membership,profile);
});
export const requestMembership = onCall(opts, async req => {
  const a = await identity(req);
  const cid = id(req.data?.companyId), legacyId = id(req.data?.legacyId);
  const role = req.data?.role;
  const contactId = role === 'partner' ? id(req.data?.contactId || 'primary') : 'primary';
  if (!['tenant_admin','tenant_staff','partner'].includes(role)) throw new HttpsError('invalid-argument','가입 구분을 확인하세요.');
  const ref = requestRef(a.uid,cid);
  const profile = {};
  for (const key of ['name','phone','companyName','businessNo']) profile[key] = String(req.data?.[key] || '').slice(0,150);
  await db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (existing.exists && existing.data().status !== 'rejected') throw new HttpsError('already-exists','이미 신청된 회사입니다.');
    tx.set(ref,{uid:a.uid,companyId:cid,legacyId,contactId,role,profile,email:a.email,status:'pending',createdAt:FieldValue.serverTimestamp()});
  });
  return {status:'pending'};
});
export const approveMembership = onCall(opts, async req => {
  const actor = await identity(req);
  const cid = id(req.data?.companyId), targetUid = id(req.data?.uid);
  const target = await getAuth().getUser(targetUid);
  if (target.disabled || !target.emailVerified) throw new HttpsError('failed-precondition','대상 계정 이메일 인증이 필요합니다.');
  if (actor.uid === targetUid) throw new HttpsError('permission-denied','자기 소속을 승인할 수 없습니다.');
  if (req.data?.confirmLegacyLink !== true) throw new HttpsError('failed-precondition','기존 문서 연결을 명시적으로 확인해야 합니다.');
  await db.runTransaction(async tx => {
    const p = await tx.get(platformRef(actor.uid));
    const admin = await tx.get(membershipRef(actor.uid,cid));
    const companyRef = db.doc(`companies/${cid}`), company = await tx.get(companyRef);
    const rref = requestRef(targetUid,cid), r = await tx.get(rref), data = r.data();
    if (!data || data.status !== 'pending' || data.uid !== targetUid || data.companyId !== cid) throw new HttpsError('failed-precondition','대기 신청이 없습니다.');
    const platform = active(p.data());
    if (!platform && !(active(admin.data()) && admin.data().companyId === cid && admin.data().role === 'tenant_admin' && active(company.data()))) throw new HttpsError('permission-denied','관리자 승인이 필요합니다.');
    if (data.role === 'tenant_admin' && !platform) throw new HttpsError('permission-denied','대표 권한은 플랫폼 관리자만 승인합니다.');
    const legacyId = id(data.legacyId), kind = data.role === 'partner' ? 'partners' : 'staffList';
    const profileRef = db.doc(`companies/${cid}/${kind}/${legacyId}`), profile = await tx.get(profileRef);
    const binding = db.doc(`identityBindings/${compoundId(cid,kind,legacyId,data.role==='partner'?data.contactId:'primary')}`), b = await tx.get(binding);
    if (b.exists && b.data().uid !== targetUid) throw new HttpsError('already-exists','이미 다른 UID에 연결된 업무 계정입니다.');
    if (!company.exists && !(platform && data.role === 'tenant_admin' && req.data?.createCompany === true)) throw new HttpsError('failed-precondition','회사 확인이 필요합니다.');
    if (!company.exists) tx.create(companyRef,{id:cid,name:data.profile.companyName,status:'active',createdAt:FieldValue.serverTimestamp()});
    if (!profile.exists) tx.create(profileRef,{id:legacyId,userId:legacyId,name:data.profile.name,phone:data.profile.phone,email:data.email,companyId:cid,role:data.role==='partner'?'partner':data.role==='tenant_admin'?'admin':'staff'});
    // Permissions are deliberately not copied from the applicant or legacy record.
    const permissions = {};
    const allowed = ['orders','loading','delivery','invoices','inventory','catalog','reports'];
    if (data.role === 'tenant_staff') for (const key of allowed) if (req.data?.permissions?.[key] === true) permissions[key] = true;
    const membership = {uid:targetUid,companyId:cid,legacyId,role:data.role,status:'active',permissions,approvedBy:actor.uid,approvedAt:FieldValue.serverTimestamp()};
    if (data.role === 'partner') { membership.partnerId = legacyId; membership.contactId = data.contactId; }
    tx.set(membershipRef(targetUid,cid),membership);
    tx.set(binding,{uid:targetUid,companyId:cid,legacyId});
    tx.update(rref,{status:'approved',approvedBy:actor.uid,approvedAt:FieldValue.serverTimestamp()});
    tx.create(db.collection('authAudit').doc(),{actor:actor.uid,target:targetUid,companyId:cid,action:'approveMembership',at:FieldValue.serverTimestamp()});
  });
  return {status:'approved'};
});
export const listMembershipRequests = onCall(opts,async req=>{
 const actor=await identity(req),cid=id(req.data?.companyId);
 const [p,m,c]=await Promise.all([platformRef(actor.uid).get(),membershipRef(actor.uid,cid).get(),db.doc(`companies/${cid}`).get()]);
 if(!active(p.data())&&!(active(m.data())&&m.data().companyId===cid&&m.data().role==='tenant_admin'&&active(c.data())))throw new HttpsError('permission-denied','관리자 권한이 필요합니다.');
 const records=await db.collection('signupRequests').where('companyId','==',cid).limit(100).get();
 return records.docs.map(d=>{const r=d.data();return {uid:r.uid,companyId:r.companyId,legacyId:r.legacyId,role:r.role,status:r.status,profile:r.profile,contactId:r.contactId||'primary'};});
});
export const updateMembership = onCall(opts,async req=>{
 const actor=await identity(req),cid=id(req.data?.companyId),uid=id(req.data?.uid);
 if(actor.uid===uid)throw new HttpsError('permission-denied','자기 권한은 변경할 수 없습니다.');
 await db.runTransaction(async tx=>{
  const [p,m,c,t]=await Promise.all([tx.get(platformRef(actor.uid)),tx.get(membershipRef(actor.uid,cid)),tx.get(db.doc(`companies/${cid}`)),tx.get(membershipRef(uid,cid))]);
  const target=t.data();
  if(!active(p.data())&&!(active(m.data())&&m.data().companyId===cid&&m.data().role==='tenant_admin'&&active(c.data())&&['tenant_staff','partner'].includes(target?.role)))throw new HttpsError('permission-denied','대상 권한을 수정할 수 없습니다.');
  if(!target||target.companyId!==cid||!['active','revoked'].includes(req.data?.status))throw new HttpsError('invalid-argument','대상 소속 또는 상태를 확인하세요.');
  const permissions={};if(target.role==='tenant_staff')for(const key of ['orders','loading','delivery','invoices','inventory','catalog','reports'])if(req.data?.permissions?.[key]===true)permissions[key]=true;
  tx.update(membershipRef(uid,cid),{permissions,status:req.data.status,updatedBy:actor.uid,updatedAt:FieldValue.serverTimestamp()});
  tx.create(db.collection('authAudit').doc(),{actor:actor.uid,target:uid,companyId:cid,action:'updateMembership',at:FieldValue.serverTimestamp()});
 });return {ok:true};
});
