import { collectionPolicy, hasCapability, canReadCollection, canWriteCollection, publicBusiness, directoryProjection } from './tenantPolicy.js';
import { generateVerificationEmailHtml, generateVerificationEmailPlainText } from './emailTemplates.js';
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
function hasPlatformAdminClaim(req) {
  const token = req.auth?.token || {};
  return token.superAdmin === true || token.platform_admin === true || token.role === 'super_admin';
}
function sessionUser(uid, cid, membership, profile) {
  // Explicit allowlist: never return legacy password, role, permissions or flags.
  const safe = {};
  for (const key of ['id','userId','name','jobTitle','warehouse','phone','email','zone']) if (profile?.[key] !== undefined) safe[key] = profile[key];
  return { ...safe, id: safe.id || membership.legacyId, userId: safe.userId || membership.legacyId,
    authUid: uid, companyId: cid, legacyId: membership.legacyId, partnerId: membership.partnerId || null,
    role: ({ tenant_admin:'admin', tenant_staff:'staff', partner:'partner', platform_admin:'super_admin' })[membership.role],
    authRole: membership.role, permissions: { ...(membership.permissions || {}), sales: ['orders','loading','delivery','invoices'].some(k=>membership.permissions?.[k]===true), purchase: membership.permissions?.invoices===true, product: membership.permissions?.catalog===true, warehouse: membership.permissions?.catalog===true, partner: membership.permissions?.orders===true, account: membership.permissions?.invoices===true, schedule: membership.permissions?.orders===true, report: membership.permissions?.reports===true }, status:'active',
    isPlatformAdmin: membership.role === 'platform_admin' };
}
export const authSession = onCall(opts, async req => {
  const account = await identity(req);
  const cid = id(req.data?.companyId);
  if (cid === 'linker_x_hq') {
    const p = (await platformRef(account.uid).get()).data();
    if (!active(p) && !hasPlatformAdminClaim(req)) throw new HttpsError('permission-denied','플랫폼 관리자 승인이 필요합니다.');
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
    const platform = active(p.data()) || hasPlatformAdminClaim(req);
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
    const membership = {uid:targetUid,companyId:cid,legacyId,userId:profile.exists ? (profile.data().userId || legacyId) : legacyId,role:data.role,status:'active',permissions,approvedBy:actor.uid,approvedAt:FieldValue.serverTimestamp()};
    if (data.role === 'partner') { membership.partnerId = legacyId; membership.contactId = data.contactId; }
    tx.set(membershipRef(targetUid,cid),membership);
    tx.set(binding,{uid:targetUid,companyId:cid,legacyId});
    tx.update(rref,{status:'approved',approvedBy:actor.uid,approvedAt:FieldValue.serverTimestamp()});
    tx.create(db.collection('authAudit').doc(),{actor:actor.uid,target:targetUid,companyId:cid,action:'approveMembership',at:FieldValue.serverTimestamp()});
  });
  return {status:'approved'};
});
export const listMembershipRequests = onCall(opts,async req=>{
  const actor=await identity(req);
  const p = await platformRef(actor.uid).get();
  const platform = active(p.data()) || hasPlatformAdminClaim(req);
  const rawCid = req.data?.companyId;

  if (platform && (!rawCid || rawCid === 'linker_x_hq' || rawCid === 'all')) {
    const records = await db.collection('signupRequests').limit(100).get();
    return records.docs.map(d => {
      const r = d.data();
      return { id: d.id, uid: r.uid, companyId: r.companyId, legacyId: r.legacyId, role: r.role, status: r.status, profile: r.profile, contactId: r.contactId || 'primary', createdAt: r.createdAt };
    });
  }

  const cid = id(rawCid);
  const [m, c] = await Promise.all([membershipRef(actor.uid, cid).get(), db.doc(`companies/${cid}`).get()]);
  if (!platform && !(active(m.data()) && m.data().companyId === cid && m.data().role === 'tenant_admin' && active(c.data()))) {
    throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
  }
  const records = await db.collection('signupRequests').where('companyId', '==', cid).limit(100).get();
  return records.docs.map(d => {
    const r = d.data();
    return { id: d.id, uid: r.uid, companyId: r.companyId, legacyId: r.legacyId, role: r.role, status: r.status, profile: r.profile, contactId: r.contactId || 'primary', createdAt: r.createdAt };
  });
});

export const getMyRegistrationStatus = onCall(opts, async req => {
  const account = await identity(req);
  const uid = account.uid;

  // 1. Check if user already has an active company membership (check for tenant_admin first)
  const membershipsSnap = await db.collection(`authz/${uid}/companies`).where('status', '==', 'active').limit(10).get();
  if (!membershipsSnap.empty) {
    const activeMembers = membershipsSnap.docs.map(d => d.data());
    const adminMem = activeMembers.find(m => m.role === 'tenant_admin');
    const target = adminMem || activeMembers[0];
    if (target) {
      const compDoc = await db.doc(`companies/${target.companyId}`).get();
      if (active(compDoc.data())) {
        return {
          status: 'approved',
          companyId: target.companyId,
          companyName: compDoc.data()?.name || target.companyId,
          role: target.role,
          isTenantAdmin: target.role === 'tenant_admin'
        };
      }
    }
  }

  // 2. Check signupRequests for this UID
  const requestsSnap = await db.collection('signupRequests').where('uid', '==', uid).limit(10).get();
  if (!requestsSnap.empty) {
    const requests = requestsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort descending by createdAt
    requests.sort((a, b) => {
      const ta = a.createdAt?._seconds || a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
      const tb = b.createdAt?._seconds || b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
      return tb - ta;
    });

    const latest = requests[0];
    if (latest.status === 'pending') {
      return {
        status: 'pending',
        companyId: latest.companyId,
        companyName: latest.profile?.companyName || latest.companyId,
        role: latest.role,
        profile: latest.profile,
        createdAt: latest.createdAt
      };
    }
    if (latest.status === 'approved') {
      const memDoc = await db.doc(`authz/${uid}/companies/${latest.companyId}`).get();
      const mem = memDoc.data();
      if (active(mem)) {
        return {
          status: 'approved',
          companyId: latest.companyId,
          companyName: latest.profile?.companyName || latest.companyId,
          role: mem.role,
          isTenantAdmin: mem.role === 'tenant_admin'
        };
      }
    }
    if (latest.status === 'rejected') {
      return {
        status: 'rejected',
        companyId: latest.companyId,
        companyName: latest.profile?.companyName || latest.companyId,
        reason: latest.reason || '신청이 반려되었습니다.'
      };
    }
  }

  return { status: 'none' };
});
export const updateMembership = onCall(opts,async req=>{
 const actor=await identity(req),cid=id(req.data?.companyId),uid=id(req.data?.uid);
 if(actor.uid===uid)throw new HttpsError('permission-denied','자기 권한은 변경할 수 없습니다.');
 await db.runTransaction(async tx=>{
  const [p,m,c,t]=await Promise.all([tx.get(platformRef(actor.uid)),tx.get(membershipRef(actor.uid,cid)),tx.get(db.doc(`companies/${cid}`)),tx.get(membershipRef(uid,cid))]);
  const target=t.data();
  const platform = active(p.data()) || hasPlatformAdminClaim(req);
  if(!platform&&!(active(m.data())&&m.data().companyId===cid&&m.data().role==='tenant_admin'&&active(c.data())&&['tenant_staff','partner'].includes(target?.role)))throw new HttpsError('permission-denied','대상 권한을 수정할 수 없습니다.');
  if(!target||target.companyId!==cid||!['active','revoked'].includes(req.data?.status))throw new HttpsError('invalid-argument','대상 소속 또는 상태를 확인하세요.');
  const permissions={};if(target.role==='tenant_staff')for(const key of ['orders','loading','delivery','invoices','inventory','catalog','reports'])if(req.data?.permissions?.[key]===true)permissions[key]=true;
  tx.update(membershipRef(uid,cid),{permissions,status:req.data.status,updatedBy:actor.uid,updatedAt:FieldValue.serverTimestamp()});
  tx.create(db.collection('authAudit').doc(),{actor:actor.uid,target:uid,companyId:cid,action:'updateMembership',at:FieldValue.serverTimestamp()});
 });return {ok:true};
});

async function tenantContext(req){
 const account=await identity(req),cid=id(req.data?.companyId);
 const [m,c]=await Promise.all([membershipRef(account.uid,cid).get(),db.doc(`companies/${cid}`).get()]);
 if(!active(m.data())||m.data().companyId!==cid||!active(c.data())||!['tenant_admin','tenant_staff'].includes(m.data().role))throw new HttpsError('permission-denied','승인된 회사 구성원만 접근할 수 있습니다.');
 const profile=await db.doc(`companies/${cid}/staffList/${id(m.data().legacyId)}`).get();
 if(!profile.exists)throw new HttpsError('failed-precondition','연결된 직원 문서가 없습니다.');
 return {uid:account.uid,cid,m:m.data(),company:c.data(),actorName:profile.data().name};
}
function legacyPath(req){
 const parts=String(req.data?.path||'').split('/');
 if(parts.length<2||parts.length>4||parts[0]!=='companies'||parts[1]!==req.data?.companyId||parts.some(p=>!p||p==='.'||p==='..'))throw new HttpsError('invalid-argument','회사 내부의 허용된 경로만 사용할 수 있습니다.');
 return parts;
}
function bundleBase(name){return name.replace(/_chunk_\d+$/,'');}
const readableSettings=['systemSettings','staffZones','staffJobTitles','recentActivity','favoriteMenus','dashboardConfig'];
function checkAccess(ctx,parts,write=false){
 const col=parts[2],key=parts[3];
 if(parts.length===2){if(write&&ctx.m.role!=='tenant_admin')throw new HttpsError('permission-denied','회사 관리자 권한이 필요합니다.');return;}
 if(col==='bundles'){
  if(!key)throw new HttpsError('permission-denied','번들 목록 접근은 허용되지 않습니다.');
  if(!(write?canWriteCollection(ctx.m,bundleBase(key)):canReadCollection(ctx.m,bundleBase(key))))throw new HttpsError('permission-denied','해당 번들 권한이 없습니다.');return;
 }
 if(col==='metadata'&&key==='syncState')return;
 if(col==='settings'&&readableSettings.includes(key)){if(write&&ctx.m.role!=='tenant_admin')throw new HttpsError('permission-denied','설정 변경 권한이 없습니다.');return;}
 if(['staffList','partners'].includes(col)&&(write?canWriteCollection(ctx.m,col):canReadCollection(ctx.m,col)))return;
 throw new HttpsError('permission-denied','이 경로는 서버 연결 경로에서 허용되지 않습니다.');
}
export const tenantRead = onCall(opts,async req=>{
 const ctx=await tenantContext(req),parts=legacyPath(req);checkAccess(ctx,parts);
 const path=parts.join('/'),col=parts[2];
 const project=(raw,docId)=>{
  let result=publicBusiness(raw);
  if(['staffList','partners'].includes(col))result=directoryProjection(col,{...raw,_docId:docId,companyId:ctx.cid},ctx.m,ctx.actorName);
  if(col==='bundles'){
   const base=bundleBase(parts[3]);
   const list=raw.list||raw.items;
   if(Array.isArray(list)){const projected=list.map(x=>directoryProjection(base,{...x,companyId:ctx.cid},ctx.m,ctx.actorName)).filter(Boolean);result={...result,list:projected};if(Array.isArray(raw.items))result.items=projected;}
  }
  if(col==='metadata')result=Object.fromEntries(Object.entries(result).filter(([k])=>canReadCollection(ctx.m,k)));
  return result;
 };
 if(parts.length===3){
  const snap=await db.collection(path).limit(2001).get();if(snap.size>2000)throw new HttpsError('resource-exhausted','분할 조회가 필요한 데이터입니다.');
  return {docs:snap.docs.map(d=>({id:d.id,data:project(d.data(),d.id)})).filter(d=>d.data!==null)};
 }
 const snapshot=await db.doc(path).get();if(!snapshot.exists)return {exists:false,id:parts.at(-1)};
 const value=project(snapshot.data(),snapshot.id);return {exists:value!==null,id:snapshot.id,data:value};
});
export const tenantWrite = onCall(opts,async req=>{
 const ctx=await tenantContext(req),parts=legacyPath(req);checkAccess(ctx,parts,true);
 if(parts.length%2!==0)throw new HttpsError('invalid-argument','문서 경로가 필요합니다.');
 const col=parts[2],input=req.data?.data;
 if(!input||Array.isArray(input)||typeof input!=='object')throw new HttpsError('invalid-argument','문서 객체가 필요합니다.');
 if(Buffer.byteLength(JSON.stringify(input),'utf8')>800000)throw new HttpsError('resource-exhausted','요청 데이터가 너무 큽니다.');
 let safe=publicBusiness(input);
 if(col==='metadata'){
  if(Object.keys(safe).some(k=>!canWriteCollection(ctx.m,k)))throw new HttpsError('permission-denied','허용되지 않은 동기화 항목입니다.');
 }
 if(col==='bundles'&&Array.isArray(safe.list))safe.list=safe.list.map(item=>({...item,companyId:ctx.cid}));
 if(['staffList','partners'].includes(col))safe={...safe,companyId:ctx.cid};
 if(parts.length===2){
  const allowed=['name','address','phone','managerContact','ceo','ceoName','businessNo','updatedAt'];
  if(Object.keys(safe).some(k=>!allowed.includes(k)))throw new HttpsError('permission-denied','회사 상태·권한·구독 변경은 이 경로에서 허용되지 않습니다.');
 }
 if(!['set','update'].includes(req.data?.operation))throw new HttpsError('invalid-argument','지원되지 않는 변경입니다.');
 const ref=db.doc(parts.join('/'));
 await db.runTransaction(async tx=>{
  const [currentMember,currentCompany]=await Promise.all([tx.get(membershipRef(ctx.uid,ctx.cid)),tx.get(db.doc(`companies/${ctx.cid}`))]);
  if(!active(currentMember.data())||currentMember.data().companyId!==ctx.cid||!active(currentCompany.data()))throw new HttpsError('permission-denied','승인 상태가 변경됐습니다.');
  const current={...ctx,m:currentMember.data()};checkAccess(current,parts,true);
  if(['staffList','partners'].includes(col)){ const existing=await tx.get(ref);if(existing.exists)for(const key of ['id','userId'])if(safe[key]!==undefined&&existing.data()[key]!==undefined&&String(safe[key])!==String(existing.data()[key]))throw new HttpsError('permission-denied','기존 계정 식별자를 변경할 수 없습니다.'); }
  if(col==='metadata'&&Object.keys(safe).some(k=>!canWriteCollection(current.m,k)))throw new HttpsError('permission-denied','동기화 권한이 변경됐습니다.');
  if(req.data.operation==='update'||parts.length===2)tx.update(ref,safe);else tx.set(ref,safe,{merge:req.data.merge===true});
 });
 return {ok:true};
});

export const generateCustomVerificationEmail = onCall(opts, async req => {
  const account = await identity(req);
  const email = account.email;
  const actionCodeSettings = {
    url: 'https://link-x-6606e.firebaseapp.com?mode=verifyEmail',
    handleCodeInApp: true
  };
  const link = await getAuth().generateEmailVerificationLink(email, actionCodeSettings);
  // Important: DO NOT log the verification link anywhere
  const html = generateVerificationEmailHtml({ link, email });
  const text = generateVerificationEmailPlainText({ link, email });
  return {
    subject: '[링커엑스] 가입을 계속하려면 이메일을 확인해 주세요',
    from: '링커엑스 <noreply@linker-x.com>',
    to: email,
    html,
    text,
    status: 'ready'
  };
});
