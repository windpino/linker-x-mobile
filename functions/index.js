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
    const isSuper = (active(p) && p.role === 'super_admin') || hasPlatformAdminClaim(req);
    const isOps = active(p) && ['support', 'subscription', 'developer', 'super_admin'].includes(p.role);
    if (!isSuper && !isOps) throw new HttpsError('permission-denied','플랫폼 운영팀 권한이 필요합니다.');

    return {
      authUid: account.uid,
      companyId: 'linker_x_hq',
      companyName: '링커엑스(Linker X) 본사 운영팀',
      role: isSuper ? 'super_admin' : p.role,
      authRole: isSuper ? 'platform_admin' : 'platform_ops',
      isPlatformAdmin: isSuper,
      isPlatformStaff: true,
      name: p?.name || account.displayName || '운영자',
      email: account.email,
      permissions: p?.permissions || {},
      status: 'active'
    };
  }
  const [m,c] = await Promise.all([membershipRef(account.uid,cid).get(),db.doc(`companies/${cid}`).get()]);
  const membership = m.data();
  if (!active(membership) || !active(c.data()) || membership.companyId !== cid) {
    throw new HttpsError('permission-denied','회사 소속 승인 또는 사용 상태를 확인해 주세요.');
  }
  const kind = membership.role === 'partner' ? 'partners' : 'staffList';
  const profile = (await db.doc(`companies/${cid}/${kind}/${id(membership.legacyId)}`).get()).data();
  if (!profile) {
    throw new HttpsError('failed-precondition','연결된 업무 계정이 없습니다.');
  }
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
    const platform = (active(p.data()) && p.data().role === 'super_admin') || hasPlatformAdminClaim(req);
    if (!platform && !(active(admin.data()) && admin.data().companyId === cid && admin.data().role === 'tenant_admin' && active(company.data()))) throw new HttpsError('permission-denied','관리자 승인이 필요합니다.');
    if (data.role === 'tenant_admin' && !platform) throw new HttpsError('permission-denied','대표 권한은 플랫폼 관리자만 승인합니다.');
    const legacyId = id(data.legacyId), kind = data.role === 'partner' ? 'partners' : 'staffList';
    const profileRef = db.doc(`companies/${cid}/${kind}/${legacyId}`), profile = await tx.get(profileRef);
    const binding = db.doc(`identityBindings/${compoundId(cid,kind,legacyId,data.role==='partner'?data.contactId:'primary')}`), b = await tx.get(binding);
    if (b.exists && b.data().uid !== targetUid) throw new HttpsError('already-exists','이미 다른 UID에 연결된 업무 계정입니다.');
    if (!company.exists && !(platform && data.role === 'tenant_admin' && req.data?.createCompany === true)) throw new HttpsError('failed-precondition','회사 확인이 필요합니다.');
    
    // 무료 이용 기간(30일) 관리: 최초 활성화 시에만 기록, 재신청이나 승인 재시도로 리셋 금지
    const compData = company.exists ? company.data() : null;
    let trialStartDate = compData?.trialStartDate || null;
    let trialEndDate = compData?.trialEndDate || null;
    if (!trialStartDate) {
      const now = new Date();
      trialStartDate = now.toISOString();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      trialEndDate = end.toISOString().split('T')[0];
    }

    if (!company.exists) {
      tx.create(companyRef, {
        id: cid,
        name: data.profile.companyName,
        companyName: data.profile.companyName,
        businessNo: data.profile.businessNo || '',
        bizNum: data.profile.businessNo || '',
        ceo: data.profile.name || '',
        managerContact: data.profile.phone || '',
        phone: data.profile.phone || '',
        email: data.email || '',
        status: 'active',
        trialStartDate,
        trialEndDate,
        createdAt: FieldValue.serverTimestamp()
      });

      // 기본 시스템 환경설정 (최초 가입 시 입력한 회사명, 사업자번호 등 자동 연동)
      const settingsRef = db.doc(`companies/${cid}/settings/systemSettings`);
      tx.set(settingsRef, {
        value: {
          company: {
            name: data.profile.companyName,
            bizNum: data.profile.businessNo || '',
            businessNo: data.profile.businessNo || '',
            ceo: data.profile.name || '',
            tel: data.profile.phone || '',
            phone: data.profile.phone || '',
            email: data.email || '',
            address: '',
            type: ''
          },
          display: {
            showMenuIcons: true,
            purchaseThemeColor: '#3b82f6',
            salesThemeColor: '#3b82f6',
            orderThemeColor: '#3b82f6'
          },
          salesInvoice: {
            warnNoStock: true,
            saveMode: 'auto'
          }
        },
        companyId: cid,
        updatedAt: FieldValue.serverTimestamp()
      });
    } else if (!compData?.trialStartDate) {
      tx.update(companyRef, { trialStartDate, trialEndDate });
    }
    const repUserId = (data.email && data.email.includes('@')) ? data.email.split('@')[0] : legacyId;
    if (!profile.exists) {
      tx.create(profileRef, {
        id: legacyId,
        userId: repUserId,
        name: data.profile.name,
        phone: data.profile.phone,
        email: data.email,
        companyId: cid,
        role: data.role === 'partner' ? 'partner' : data.role === 'tenant_admin' ? 'admin' : 'staff',
        jobTitle: data.role === 'tenant_admin' ? '대표' : '사원',
        department: data.role === 'tenant_admin' ? '경영진' : '영업부',
        zone: '본사',
        warehouse: '기본 창고',
        isCompanyAdmin: data.role === 'tenant_admin',
        isMasterAdmin: data.role === 'tenant_admin',
        accountStatus: 'linked',
        linkedUid: targetUid,
        linkedEmail: data.email,
        linkedAt: trialStartDate,
        sequence: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
    if (data.role === 'tenant_admin' && !company.exists) {
      // 기본 창고 생성
      const whRef = db.doc(`companies/${cid}/warehouses/wh_default`);
      tx.set(whRef, {
        id: 'wh_default',
        name: '기본 창고',
        code: 'WH01',
        isMain: true,
        companyId: cid,
        manager: data.profile.name,
        phone: data.profile.phone,
        location: '본사',
        order: 1,
        sequence: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
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

// ─────────────────────────────────────────────────────────────
// 플랫폼 관리자 전용: 회원사와 연관 데이터를 영구 삭제
// ─────────────────────────────────────────────────────────────
// Firestore는 부모 문서를 삭제해도 하위 컬렉션을 자동으로 지우지 않는다.
// 이 작업은 반드시 Admin SDK에서 재귀 삭제하고, 회사 밖에 있는 권한/초대
// 참조까지 함께 정리한다. 브라우저에서 직접 삭제하면 보안 규칙과 누락된
// 하위 컬렉션 때문에 완전 삭제를 보장할 수 없다.
export const deleteCompanyPermanently = onCall(opts, async req => {
  const actor = await identity(req);
  const cid = id(req.data?.companyId);
  if (String(req.data?.confirmCompanyId || '') !== cid) {
    throw new HttpsError('failed-precondition', '삭제할 회원사 ID를 정확히 입력해 확인해야 합니다.');
  }

  const platform = await platformRef(actor.uid).get();
  if (!(active(platform.data()) && platform.data().role === 'super_admin') && !hasPlatformAdminClaim(req)) {
    throw new HttpsError('permission-denied', '슈퍼관리자만 회원사를 영구 삭제할 수 있습니다.');
  }

  const companyRef = db.doc(`companies/${cid}`);
  const compDoc = await companyRef.get();

  const deleted = { rootReferences: 0, memberships: 0 };
  const deleteQueryInBatches = async (makeQuery, counter) => {
    while (true) {
      const snap = await makeQuery().limit(400).get();
      if (snap.empty) return;
      const batch = db.batch();
      for (const row of snap.docs) batch.delete(row.ref);
      await batch.commit();
      deleted[counter] += snap.size;
    }
  };

  // 회사 외부에 남는 참조를 먼저 삭제한다. 오류를 삼키지 않으므로, 완료
  // 메시지는 모든 참조 정리와 재귀 삭제가 끝난 경우에만 반환된다.
  const rootReferences = [
    ['cs_history', 'companyId'],
    ['agency_inquiries', 'approvedCompanyId'],
    ['users', 'companyId'],
    ['identityBindings', 'companyId'],
    ['signupRequests', 'companyId'],
    ['invitations', 'companyId'],
    ['authAudit', 'companyId']
  ];
  for (const [collectionName, field] of rootReferences) {
      await deleteQueryInBatches(
        () => db.collection(collectionName).where(field, '==', cid),
        'rootReferences'
      );
  }

  // 과거 클라이언트가 만들던 단일 사용자 문서와 회사별 설정 컬렉션도 정리한다.
    const legacyUserRef = db.doc(`users/uid_${cid}`);
    if ((await legacyUserRef.get()).exists) {
      await legacyUserRef.delete();
      deleted.rootReferences += 1;
    }
    await deleteQueryInBatches(
      () => db.collection(`settings_${cid}`),
      'rootReferences'
    );

  // 현재 보안 구조의 권한 문서는 authz/{uid}/companies/{cid}에 있다.
  // collectionGroup 조회로 모든 UID의 소속 권한을 함께 정리한다.
    await deleteQueryInBatches(
      () => db.collectionGroup('companies').where('companyId', '==', cid),
      'memberships'
    );

  // 회사 문서 아래의 모든 하위 컬렉션과 중첩 컬렉션(백업 청크 포함)을 삭제한다.
  await db.recursiveDelete(companyRef);

    await db.collection('deletionAudit').add({
      actor: actor.uid,
      companyId: cid,
      action: 'deleteCompanyPermanently',
      deleted,
      at: FieldValue.serverTimestamp()
    });

  return { ok: true, companyId: cid, deleted };
});
export const listMembershipRequests = onCall(opts,async req=>{
  const actor=await identity(req);
  const p = await platformRef(actor.uid).get();
  const platform = (active(p.data()) && p.data().role === 'super_admin') || hasPlatformAdminClaim(req);
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
        const cdata = compDoc.data() || {};
        const trialEndDate = cdata.trialEndDate || null;
        let trialDaysRemaining = 30;
        if (trialEndDate) {
          const diffMs = new Date(trialEndDate).getTime() - new Date().setHours(0, 0, 0, 0);
          trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }
        return {
          status: 'approved',
          companyId: target.companyId,
          companyName: cdata.name || target.companyId,
          role: target.role,
          isTenantAdmin: target.role === 'tenant_admin',
          trialStartDate: cdata.trialStartDate || null,
          trialEndDate: trialEndDate,
          trialDaysRemaining
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
  const platform = (active(p.data()) && p.data().role === 'super_admin') || hasPlatformAdminClaim(req);
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
const readableSettings=['systemSettings','staffZones','staffJobTitles','recentActivity','favoriteMenus','dashboardConfig','licenseData'];
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

// ─────────────────────────────────────────────────────────────
// 1. 신규 회원사 가입 즉시 개설 (승인 대기 없이 바로 업무 시작)
// ─────────────────────────────────────────────────────────────
export const registerNewTenantDirect = onCall(opts, async req => {
  const account = await identity(req);
  const uid = account.uid;
  const email = account.email;
  const profile = {
    name: String(req.data?.name || '').trim().slice(0, 100),
    phone: String(req.data?.phone || '').trim().slice(0, 50),
    companyName: String(req.data?.companyName || '').trim().slice(0, 100),
    businessNo: String(req.data?.businessNo || '').trim().slice(0, 50)
  };
  if (!profile.companyName) throw new HttpsError('invalid-argument', '회사명을 입력해 주세요.');
  if (!profile.name) throw new HttpsError('invalid-argument', '담당자(대표자) 성명을 입력해 주세요.');

  // 1. 중복 가입 방어: 이미 이 사용자가 소유한 회사가 있다면 기존 회사 반환 (중복 생성 및 체험일 리셋 방지)
  const existingMembers = await db.collection(`authz/${uid}/companies`).where('role', '==', 'tenant_admin').limit(1).get();
  if (!existingMembers.empty) {
    const mem = existingMembers.docs[0].data();
    const existingComp = (await db.doc(`companies/${mem.companyId}`).get()).data();
    if (active(existingComp)) {
      return {
        status: 'active',
        companyId: mem.companyId,
        companyName: existingComp.name,
        role: 'admin',
        authRole: 'tenant_admin',
        isTenantAdmin: true,
        alreadyExisted: true
      };
    }
  }

  // 2. 고유 내부 회사 식별자 자동 발급
  const cid = `comp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const companyRef = db.doc(`companies/${cid}`);

  // 3. 30일 무료 체험 기간 계산 (최초 활성화 시 1회 고정)
  const now = new Date();
  const trialStartDate = now.toISOString();
  const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const trialEndDate = trialEnd.toISOString().split('T')[0];

  await db.runTransaction(async tx => {
    // 회사 레코드 생성
    tx.set(companyRef, {
      id: cid,
      name: profile.companyName,
      companyName: profile.companyName,
      businessNo: profile.businessNo,
      bizNum: profile.businessNo,
      ceo: profile.name,
      managerContact: profile.phone,
      phone: profile.phone,
      email,
      status: 'active',
      plan: '무료 체험판 (30일)',
      trialStartDate,
      trialEndDate,
      expiryDate: trialEndDate,
      createdAt: FieldValue.serverTimestamp()
    });

    // 기본 시스템 환경설정 (최초 가입 시 입력한 회사명, 사업자번호 등 자동 연동)
    const settingsRef = db.doc(`companies/${cid}/settings/systemSettings`);
    tx.set(settingsRef, {
      value: {
        company: {
          name: profile.companyName,
          bizNum: profile.businessNo,
          businessNo: profile.businessNo,
          ceo: profile.name,
          tel: profile.phone,
          phone: profile.phone,
          email,
          address: '',
          type: ''
        },
        display: {
          showMenuIcons: true,
          purchaseThemeColor: '#3b82f6',
          salesThemeColor: '#3b82f6',
          orderThemeColor: '#3b82f6'
        },
        salesInvoice: {
          warnNoStock: true,
          saveMode: 'auto'
        }
      },
      companyId: cid,
      updatedAt: FieldValue.serverTimestamp()
    });

    // 첫 관리자 권한 및 대표 아이디 계산
    const allPerms = { ALL: true, orders: true, loading: true, delivery: true, invoices: true, inventory: true, catalog: true, reports: true };
    const repUserId = (email && email.includes('@')) ? email.split('@')[0] : (uid.slice(0, 8) || 'admin');

    // 대표자 직원 프로필 생성 (회원사 등록 기본 정보 입력 내용 기반)
    const staffRef = db.doc(`companies/${cid}/staffList/${uid}`);
    tx.set(staffRef, {
      id: uid,
      userId: repUserId,
      name: profile.name,
      phone: profile.phone,
      email,
      role: 'admin',
      jobTitle: '대표',
      department: '경영진',
      zone: '본사',
      warehouse: '기본 창고',
      isCompanyAdmin: true,
      isMasterAdmin: true,
      accountStatus: 'linked',
      linkedUid: uid,
      linkedEmail: email,
      linkedAt: trialStartDate,
      sequence: 1,
      permissions: allPerms,
      companyId: cid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // 첫 관리자 권한 멤버십 등록
    tx.set(membershipRef(uid, cid), {
      uid,
      companyId: cid,
      companyName: profile.companyName,
      legacyId: uid,
      userId: repUserId,
      role: 'tenant_admin',
      status: 'active',
      permissions: allPerms,
      approvedAt: FieldValue.serverTimestamp()
    });

    // 식별자 바인딩
    const binding = db.doc(`identityBindings/${compoundId(cid, 'staffList', uid, 'primary')}`);
    tx.set(binding, { uid, companyId: cid, legacyId: uid });

    // 기본 창고 자동 생성 ('기본 창고'로 생성)
    const whRef = db.doc(`companies/${cid}/warehouses/wh_default`);
    tx.set(whRef, {
      id: 'wh_default',
      name: '기본 창고',
      code: 'WH01',
      isMain: true,
      companyId: cid,
      manager: profile.name,
      phone: profile.phone,
      location: '본사',
      order: 1,
      sequence: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  return {
    status: 'active',
    companyId: cid,
    companyName: profile.companyName,
    role: 'admin',
    authRole: 'tenant_admin',
    isTenantAdmin: true,
    trialStartDate,
    trialEndDate
  };
});

// ─────────────────────────────────────────────────────────────
// 2. 로그인 사용자 소속 워크스페이스 및 대기 초대 목록 조회
// ─────────────────────────────────────────────────────────────
export const getMyWorkspaces = onCall(opts, async req => {
  const account = await identity(req);
  const uid = account.uid;
  const email = (account.email || '').toLowerCase().trim();
  const workspaces = [];

  // 0. 링커엑스(Linker X) 본사 운영팀 소속 확인
  const pDoc = await platformRef(uid).get();
  if (pDoc.exists && pDoc.data().status === 'active') {
    const pData = pDoc.data();
    const roleLabel = pData.role === 'super_admin' ? '최고 운영 관리자 (슈퍼관리자)'
      : pData.role === 'support' ? '운영팀 고객지원 담당자'
      : pData.role === 'subscription' ? '운영팀 구독관리 담당자'
      : '운영팀 플랫폼 개발자';
    workspaces.push({
      companyId: 'linker_x_hq',
      companyName: '링커엑스(Linker X) 본사 운영팀',
      role: pData.role,
      authRole: 'platform_ops',
      isPlatformStaff: true,
      isSuperAdmin: pData.role === 'super_admin',
      type: 'platform_ops',
      roleLabel
    });
  }

  // 1. 활성 회원사 소속 조회
  const membershipsSnap = await db.collection(`authz/${uid}/companies`).where('status', '==', 'active').limit(20).get();
  for (const docSnap of membershipsSnap.docs) {
    const mem = docSnap.data();
    const compDoc = await db.doc(`companies/${mem.companyId}`).get();
    const compData = compDoc.data();
    if (active(compData)) {
      const isPartner = mem.role === 'partner';
      let partnerName = '';
      if (isPartner && mem.partnerId) {
        const pDoc = await db.doc(`companies/${mem.companyId}/partners/${mem.partnerId}`).get();
        partnerName = pDoc.data()?.name || mem.partnerId;
      }
      workspaces.push({
        companyId: mem.companyId,
        companyName: compData.name || mem.companyId,
        role: mem.role === 'tenant_admin' ? 'admin' : isPartner ? 'partner' : 'staff',
        authRole: mem.role,
        isTenantAdmin: mem.role === 'tenant_admin',
        type: isPartner ? 'partner_order' : 'company_work',
        roleLabel: mem.role === 'tenant_admin' ? '회사 관리자 (Admin)' : isPartner ? `거래처 주문 (${partnerName || '고객사'})` : '직원 (Staff)',
        partnerId: mem.partnerId || null,
        partnerName: partnerName || null
      });
    }
  }

  // 2. 대기 중인 초대 목록 조회 (이메일 기준)
  let pendingInvitations = [];
  if (email) {
    const invSnap = await db.collection('invitations')
      .where('targetEmail', '==', email)
      .where('status', '==', 'pending')
      .limit(10)
      .get();
    pendingInvitations = invSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  return { workspaces, pendingInvitations };
});

// ─────────────────────────────────────────────────────────────
// 3. 직원 초대 생성 (회사 관리자 -> 개인 이메일 초대)
// ─────────────────────────────────────────────────────────────
export const createStaffInvitation = onCall(opts, async req => {
  const account = await identity(req);
  const cid = id(req.data?.companyId);
  const [m, c] = await Promise.all([membershipRef(account.uid, cid).get(), db.doc(`companies/${cid}`).get()]);
  if (!active(m.data()) || m.data().role !== 'tenant_admin' || !active(c.data())) {
    throw new HttpsError('permission-denied', '회사 관리자만 직원을 초대할 수 있습니다.');
  }

  const targetEmail = String(req.data?.targetEmail || '').toLowerCase().trim();
  const staffName = String(req.data?.staffName || '').trim();
  const staffId = id(req.data?.staffId || `staff_${Date.now()}`);
  const permissions = req.data?.permissions || {};
  if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
    throw new HttpsError('invalid-argument', '유효한 직원 이메일 주소를 입력해 주세요.');
  }

  const staffRef = db.doc(`companies/${cid}/staffList/${staffId}`);
  const staffDoc = await staffRef.get();
  if (staffDoc.exists) {
    const sData = staffDoc.data();
    if (sData.accountStatus === 'linked' && sData.linkedEmail && sData.linkedEmail !== targetEmail) {
      throw new HttpsError('already-exists', `이미 다른 계정(${sData.linkedEmail})에 연결된 직원 카드입니다.`);
    }
  }

  const invRef = db.collection('invitations').doc();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14일 유효

  await invRef.set({
    id: invRef.id,
    type: 'staff',
    companyId: cid,
    companyName: c.data().name || cid,
    targetEmail,
    staffName: staffName || targetEmail.split('@')[0],
    staffId,
    phone: req.data?.phone || '',
    permissions,
    role: 'tenant_staff',
    invitedBy: account.uid,
    invitedByName: account.displayName || '관리자',
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: expiresAt.toISOString()
  });

  if (staffDoc.exists) {
    await staffRef.set({
      accountStatus: 'invited',
      invitationEmail: targetEmail,
      invitedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  return { ok: true, invitationId: invRef.id, targetEmail };
});

// ─────────────────────────────────────────────────────────────
// 3-1. 직원의 직접 연결 요청 (로그인 화면에서 대표 이메일로 요청)
// ─────────────────────────────────────────────────────────────
export const requestStaffConnection = onCall(opts, async req => {
  const account = await identity(req);
  const repEmail = String(req.data?.representativeEmail || '').toLowerCase().trim();
  if (!repEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(repEmail)) {
    throw new HttpsError('invalid-argument', '연결할 회사의 대표 이메일을 정확히 입력해 주세요.');
  }

  // 대표 이메일로 회사 찾기
  let targetCompany = null;
  const compSnap = await db.collection('companies').where('representativeEmail', '==', repEmail).limit(1).get();
  if (!compSnap.empty) {
    targetCompany = { id: compSnap.docs[0].id, ...compSnap.docs[0].data() };
  } else {
    const adminSnap = await db.collectionGroup('memberships')
      .where('role', '==', 'tenant_admin')
      .where('email', '==', repEmail)
      .limit(1)
      .get();
    if (!adminSnap.empty) {
      const cid = adminSnap.docs[0].data().companyId;
      const cDoc = await db.doc(`companies/${cid}`).get();
      if (cDoc.exists) targetCompany = { id: cDoc.id, ...cDoc.data() };
    }
  }

  if (!targetCompany) {
    const directComp = await db.collection('companies').where('email', '==', repEmail).limit(1).get();
    if (!directComp.empty) targetCompany = { id: directComp.docs[0].id, ...directComp.docs[0].data() };
  }

  if (!targetCompany) {
    throw new HttpsError('not-found', `해당 대표 이메일(${repEmail})로 등록된 회원사를 찾을 수 없습니다. 회사 관리자에게 대표 이메일을 확인해 주세요.`);
  }

  const cid = targetCompany.id;

  // 이미 연결된 계정인지 확인 (멱등성 보장)
  const memRef = membershipRef(account.uid, cid);
  const memDoc = await memRef.get();
  if (memDoc.exists && memDoc.data().status === 'active') {
    return { ok: true, companyId: cid, companyName: targetCompany.name || cid, status: 'connected', alreadyLinked: true };
  }

  // 대기 요청 저장
  const reqRef = db.doc(`companies/${cid}/staffConnectionRequests/${account.uid}`);
  await reqRef.set({
    id: account.uid,
    uid: account.uid,
    applicantEmail: (account.email || '').toLowerCase().trim(),
    applicantName: account.displayName || account.email.split('@')[0],
    representativeEmail: repEmail,
    companyId: cid,
    companyName: targetCompany.name || cid,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp()
  });

  return { ok: true, companyId: cid, companyName: targetCompany.name || cid, status: 'pending' };
});

// ─────────────────────────────────────────────────────────────
// 3-2. 회사 관리자의 직원 연결 요청 목록 조회
// ─────────────────────────────────────────────────────────────
export const listStaffConnectionRequests = onCall(opts, async req => {
  const account = await identity(req);
  const cid = id(req.data?.companyId);
  const [m, c] = await Promise.all([membershipRef(account.uid, cid).get(), db.doc(`companies/${cid}`).get()]);
  if (!active(m.data()) || m.data().role !== 'tenant_admin' || !active(c.data())) {
    throw new HttpsError('permission-denied', '회사 관리자만 연결 요청 목록을 조회할 수 있습니다.');
  }

  const snap = await db.collection(`companies/${cid}/staffConnectionRequests`)
    .where('status', '==', 'pending')
    .limit(50)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
});

// ─────────────────────────────────────────────────────────────
// 3-3. 회사 관리자가 직원을 계정과 연결 승인
// ─────────────────────────────────────────────────────────────
export const connectStaffAccount = onCall(opts, async req => {
  const account = await identity(req);
  const cid = id(req.data?.companyId);
  const staffId = id(req.data?.staffId);
  const applicantUid = id(req.data?.applicantUid);
  const applicantEmail = String(req.data?.applicantEmail || '').toLowerCase().trim();

  const [m, c] = await Promise.all([membershipRef(account.uid, cid).get(), db.doc(`companies/${cid}`).get()]);
  if (!active(m.data()) || m.data().role !== 'tenant_admin' || !active(c.data())) {
    throw new HttpsError('permission-denied', '회사 관리자만 직원을 연결할 수 있습니다.');
  }

  const staffRef = db.doc(`companies/${cid}/staffList/${staffId}`);
  const memRef = membershipRef(applicantUid, cid);
  const reqRef = db.doc(`companies/${cid}/staffConnectionRequests/${applicantUid}`);

  await db.runTransaction(async tx => {
    const [staffDoc, memDoc] = await Promise.all([tx.get(staffRef), tx.get(memRef)]);
    if (!staffDoc.exists) throw new HttpsError('not-found', '연결할 직원 카드를 찾을 수 없습니다.');
    const staffData = staffDoc.data();

    // 이미 다른 계정에 연결된 직원 카드는 덮어쓰지 않음
    if (staffData.linkedUid && staffData.linkedUid !== applicantUid) {
      throw new HttpsError('already-exists', `이미 다른 계정(${staffData.linkedEmail || staffData.linkedUid})에 연결된 직원 카드입니다. 다른 직원을 선택하거나 새로 등록해 주세요.`);
    }

    // 이미 같은 계정에 연결돼 있는 경우 멱등성 유지
    if (staffData.linkedUid === applicantUid && memDoc.exists && memDoc.data().status === 'active') {
      return;
    }

    // 1) 직원 카드 업데이트 (기존 id, name, 업무 기록 연결 보존)
    tx.set(staffRef, {
      accountStatus: 'linked',
      linkedUid: applicantUid,
      linkedEmail: applicantEmail,
      linkedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // 2) 회사 소속(membership) 부여
    tx.set(memRef, {
      uid: applicantUid,
      email: applicantEmail,
      companyId: cid,
      companyName: c.data().name || cid,
      legacyId: staffId,
      userId: staffData.userId || staffId,
      role: 'tenant_staff',
      status: 'active',
      permissions: staffData.permissions || {},
      approvedBy: account.uid,
      approvedAt: FieldValue.serverTimestamp()
    });

    // 3) identityBindings
    tx.set(db.doc(`identityBindings/${compoundId(cid, 'staffList', staffId, 'primary')}`), {
      uid: applicantUid,
      companyId: cid,
      legacyId: staffId
    });

    // 4) 대기 요청 상태 변경
    tx.set(reqRef, { status: 'approved', connectedStaffId: staffId, approvedAt: FieldValue.serverTimestamp() }, { merge: true });
  });

  return { ok: true, companyId: cid, staffId, applicantEmail };
});

// ─────────────────────────────────────────────────────────────
// 3-4. 직원 퇴사 처리 (계정 접근 권한 즉시 해제 & 기존 업무 기록 보존)
// ─────────────────────────────────────────────────────────────
export const revokeStaffAccess = onCall(opts, async req => {
  const account = await identity(req);
  const cid = id(req.data?.companyId);
  const staffId = id(req.data?.staffId);
  const targetUid = req.data?.uid ? id(req.data.uid) : null;

  const [m, c] = await Promise.all([membershipRef(account.uid, cid).get(), db.doc(`companies/${cid}`).get()]);
  if (!active(m.data()) || m.data().role !== 'tenant_admin' || !active(c.data())) {
    throw new HttpsError('permission-denied', '회사 관리자만 직원의 접근 권한을 해제할 수 있습니다.');
  }

  const staffRef = db.doc(`companies/${cid}/staffList/${staffId}`);
  const staffDoc = await staffRef.get();
  const staffData = staffDoc.exists ? staffDoc.data() : null;
  const uidToRevoke = targetUid || staffData?.linkedUid;

  await db.runTransaction(async tx => {
    if (staffDoc.exists) {
      tx.set(staffRef, {
        accountStatus: 'unlinked',
        linkedUid: null,
        linkedEmail: null,
        resigned: true,
        resignedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    if (uidToRevoke) {
      const memRef = membershipRef(uidToRevoke, cid);
      tx.set(memRef, {
        status: 'resigned',
        resignedAt: FieldValue.serverTimestamp(),
        revokedBy: account.uid
      }, { merge: true });
    }
  });

  return { ok: true, companyId: cid, staffId, revokedUid: uidToRevoke };
});

// ─────────────────────────────────────────────────────────────
// 3-5. 링커엑스 본사 운영팀 직원 초대 (슈퍼관리자 전용)
// ─────────────────────────────────────────────────────────────
export const createPlatformStaffInvitation = onCall(opts, async req => {
  const account = await identity(req);
  const pDoc = await platformRef(account.uid).get();
  const isSuper = (pDoc.exists && pDoc.data().role === 'super_admin' && pDoc.data().status === 'active') || hasPlatformAdminClaim(req);
  if (!isSuper) throw new HttpsError('permission-denied', '슈퍼관리자만 운영팀 직원을 초대할 수 있습니다.');

  const targetEmail = String(req.data?.targetEmail || '').toLowerCase().trim();
  const staffName = String(req.data?.staffName || '').trim();
  const staffId = id(req.data?.staffId || `pstaff_${Date.now()}`);
  const role = req.data?.role || 'support';
  if (!['support', 'subscription', 'developer'].includes(role)) {
    throw new HttpsError('invalid-argument', '유효한 운영 역할을 지정해 주세요.');
  }
  if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
    throw new HttpsError('invalid-argument', '유효한 직원 이메일 주소를 입력해 주세요.');
  }

  const staffRef = db.doc(`platformStaff/${staffId}`);
  const staffDoc = await staffRef.get();
  if (staffDoc.exists) {
    const sData = staffDoc.data();
    if (sData.accountStatus === 'linked' && sData.linkedEmail && sData.linkedEmail !== targetEmail) {
      throw new HttpsError('already-exists', `이미 다른 계정(${sData.linkedEmail})에 연결된 직원 카드입니다.`);
    }
  }

  const invRef = db.collection('invitations').doc();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const permissions = role === 'support'
    ? { customerSupport: true, viewErrors: true, viewSync: true, tenantBusinessData: false }
    : role === 'subscription'
    ? { subscriptionManage: true, viewBilling: true, viewPlans: true, tenantBusinessData: false }
    : { developer: true, viewErrors: true, viewSync: true, tenantBusinessData: false };

  await invRef.set({
    id: invRef.id,
    type: 'platform_staff',
    companyId: 'linker_x_hq',
    companyName: '링커엑스(Linker X) 본사 운영팀',
    targetEmail,
    staffName: staffName || targetEmail.split('@')[0],
    staffId,
    phone: req.data?.phone || '',
    dept: req.data?.dept || '운영팀',
    tasks: req.data?.tasks || '',
    role,
    permissions,
    invitedBy: account.uid,
    invitedByName: account.displayName || '슈퍼관리자',
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: expiresAt.toISOString()
  });

  await staffRef.set({
    id: staffId,
    name: staffName,
    email: targetEmail,
    role,
    dept: req.data?.dept || '운영팀',
    tasks: req.data?.tasks || '',
    accountStatus: 'invited',
    invitationEmail: targetEmail,
    invitedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  await db.collection('authAudit').add({
    actor: account.uid,
    target: staffId,
    targetEmail,
    role,
    action: 'createPlatformStaffInvitation',
    at: FieldValue.serverTimestamp()
  });

  return { ok: true, invitationId: invRef.id, targetEmail, role };
});

// ─────────────────────────────────────────────────────────────
// 3-6. 링커엑스 운영팀 역할 변경 (슈퍼관리자 전용)
// ─────────────────────────────────────────────────────────────
export const updatePlatformStaffRole = onCall(opts, async req => {
  const account = await identity(req);
  const pDoc = await platformRef(account.uid).get();
  const isSuper = (pDoc.exists && pDoc.data().role === 'super_admin' && pDoc.data().status === 'active') || hasPlatformAdminClaim(req);
  if (!isSuper) throw new HttpsError('permission-denied', '슈퍼관리자만 운영 역할을 변경할 수 있습니다.');

  const staffId = id(req.data?.staffId);
  const newRole = req.data?.newRole || req.data?.role;
  if (!['support', 'subscription', 'developer'].includes(newRole)) {
    throw new HttpsError('invalid-argument', '유효하지 않은 역할입니다.');
  }

  const staffRef = db.doc(`platformStaff/${staffId}`);
  const staffDoc = await staffRef.get();
  if (!staffDoc.exists) throw new HttpsError('not-found', '직원 카드를 찾을 수 없습니다.');
  const staffData = staffDoc.data();

  const permissions = newRole === 'support'
    ? { customerSupport: true, viewErrors: true, viewSync: true, tenantBusinessData: false }
    : newRole === 'subscription'
    ? { subscriptionManage: true, viewBilling: true, viewPlans: true, tenantBusinessData: false }
    : { developer: true, viewErrors: true, viewSync: true, tenantBusinessData: false };

  await staffRef.set({
    role: newRole,
    dept: req.data?.dept || staffData.dept || '',
    tasks: req.data?.tasks || staffData.tasks || '',
    permissions,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  if (staffData.linkedUid) {
    await platformRef(staffData.linkedUid).set({
      role: newRole,
      permissions,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: account.uid
    }, { merge: true });
  }

  await db.collection('authAudit').add({
    actor: account.uid,
    target: staffId,
    targetUid: staffData.linkedUid || null,
    oldRole: staffData.role,
    newRole,
    action: 'updatePlatformStaffRole',
    at: FieldValue.serverTimestamp()
  });

  return { ok: true, staffId, newRole };
});

// ─────────────────────────────────────────────────────────────
// 3-7. 링커엑스 운영팀 접근 권한 해제 / 퇴사 (슈퍼관리자 전용)
// ─────────────────────────────────────────────────────────────
export const revokePlatformStaffAccess = onCall(opts, async req => {
  const account = await identity(req);
  const pDoc = await platformRef(account.uid).get();
  const isSuper = (pDoc.exists && pDoc.data().role === 'super_admin' && pDoc.data().status === 'active') || hasPlatformAdminClaim(req);
  if (!isSuper) throw new HttpsError('permission-denied', '슈퍼관리자만 운영팀 접근 권한을 해제할 수 있습니다.');

  const staffId = id(req.data?.staffId);
  const staffRef = db.doc(`platformStaff/${staffId}`);
  const staffDoc = await staffRef.get();
  if (!staffDoc.exists) throw new HttpsError('not-found', '직원 카드를 찾을 수 없습니다.');
  const staffData = staffDoc.data();
  const uidToRevoke = staffData.linkedUid;

  await staffRef.set({
    accountStatus: 'revoked',
    status: '접근해제',
    resigned: true,
    resignedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  if (uidToRevoke) {
    // 링커엑스 운영팀 권한만 회수! (회원사 소속과 기존 업무 기록은 온전히 보존)
    await platformRef(uidToRevoke).set({
      status: 'revoked',
      revokedAt: FieldValue.serverTimestamp(),
      revokedBy: account.uid
    }, { merge: true });
  }

  await db.collection('authAudit').add({
    actor: account.uid,
    target: staffId,
    targetUid: uidToRevoke || null,
    action: 'revokePlatformStaffAccess',
    at: FieldValue.serverTimestamp()
  });

  return { ok: true, staffId, revokedUid: uidToRevoke };
});

// ─────────────────────────────────────────────────────────────
// 4. 거래처 주문 초대 생성 (공급사 관리자 -> 거래처 담당자 이메일 초대)
// ─────────────────────────────────────────────────────────────
export const createPartnerInvitation = onCall(opts, async req => {
  const account = await identity(req);
  const cid = id(req.data?.companyId);
  const partnerId = id(req.data?.partnerId);
  const [m, c, p] = await Promise.all([
    membershipRef(account.uid, cid).get(),
    db.doc(`companies/${cid}`).get(),
    db.doc(`companies/${cid}/partners/${partnerId}`).get()
  ]);
  if (!active(m.data()) || m.data().role !== 'tenant_admin' || !active(c.data())) {
    throw new HttpsError('permission-denied', '회사 관리자만 거래처 주문 초대를 보낼 수 있습니다.');
  }
  if (!p.exists) throw new HttpsError('not-found', '지정된 거래처 정보를 찾을 수 없습니다.');

  const targetEmail = String(req.data?.targetEmail || '').toLowerCase().trim();
  const contactName = String(req.data?.contactName || p.data().ceo || '').trim();
  if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
    throw new HttpsError('invalid-argument', '유효한 거래처 담당자 이메일을 입력해 주세요.');
  }

  const invRef = db.collection('invitations').doc();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await invRef.set({
    id: invRef.id,
    type: 'partner_order',
    companyId: cid,
    companyName: c.data().name || cid,
    partnerId,
    partnerName: p.data().name || partnerId,
    targetEmail,
    contactName,
    phone: req.data?.phone || p.data().phone || '',
    role: 'partner',
    invitedBy: account.uid,
    invitedByName: account.displayName || '관리자',
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: expiresAt.toISOString()
  });

  return { ok: true, invitationId: invRef.id, targetEmail, partnerName: p.data().name };
});

// ─────────────────────────────────────────────────────────────
// 5. 초대 수락 (직원 또는 거래처 주문 초대 수락 및 UID 연결)
// ─────────────────────────────────────────────────────────────
export const acceptInvitation = onCall(opts, async req => {
  const account = await identity(req);
  const uid = account.uid;
  const invId = id(req.data?.invitationId);
  const invRef = db.doc(`invitations/${invId}`);

  await db.runTransaction(async tx => {
    const invDoc = await tx.get(invRef);
    if (!invDoc.exists) throw new HttpsError('not-found', '초대장을 찾을 수 없습니다.');
    const inv = invDoc.data();
    if (inv.status !== 'pending') throw new HttpsError('failed-precondition', '이미 처리되었거나 만료된 초대입니다.');
    if (inv.targetEmail !== (account.email || '').toLowerCase().trim()) {
      throw new HttpsError('permission-denied', '초대 대상 이메일 계정으로 로그인해야 수락할 수 있습니다.');
    }

    const cid = inv.companyId;
    if (inv.type === 'staff') {
      // 1) 직원 초대 수락: staffList 연결 및 tenant_staff 권한 부여
      const staffRef = db.doc(`companies/${cid}/staffList/${inv.staffId}`);
      const existingStaff = await tx.get(staffRef);
      if (existingStaff.exists && existingStaff.data().linkedUid && existingStaff.data().linkedUid !== uid) {
        throw new HttpsError('already-exists', `이미 다른 계정(${existingStaff.data().linkedEmail || existingStaff.data().linkedUid})에 연결된 직원 카드입니다.`);
      }
      if (!existingStaff.exists) {
        tx.set(staffRef, {
          id: inv.staffId,
          userId: inv.staffId,
          name: inv.staffName || account.displayName || '직원',
          email: account.email,
          phone: inv.phone || '',
          role: 'staff',
          companyId: cid,
          accountStatus: 'linked',
          linkedUid: uid,
          linkedEmail: account.email,
          linkedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp()
        });
      } else {
        tx.set(staffRef, {
          accountStatus: 'linked',
          linkedUid: uid,
          linkedEmail: account.email,
          linkedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      }
      tx.set(membershipRef(uid, cid), {
        uid,
        email: account.email,
        companyId: cid,
        companyName: inv.companyName,
        legacyId: inv.staffId,
        userId: inv.staffId,
        role: 'tenant_staff',
        status: 'active',
        permissions: inv.permissions || {},
        approvedBy: inv.invitedBy,
        approvedAt: FieldValue.serverTimestamp()
      });
      tx.set(db.doc(`identityBindings/${compoundId(cid, 'staffList', inv.staffId, 'primary')}`), { uid, companyId: cid, legacyId: inv.staffId });
      // 중복 요청 정리: 직접 요청이 있었다면 승인 완료 처리
      tx.set(db.doc(`companies/${cid}/staffConnectionRequests/${uid}`), {
        status: 'approved',
        connectedStaffId: inv.staffId,
        approvedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    } else if (inv.type === 'partner_order') {
      // 2) 거래처 주문 초대 수락: partnerId 연결 및 partner 역할 부여 (타사/내부 데이터 격리)
      tx.set(membershipRef(uid, cid), {
        uid,
        companyId: cid,
        companyName: inv.companyName,
        legacyId: inv.partnerId,
        partnerId: inv.partnerId,
        role: 'partner',
        status: 'active',
        permissions: { orders: true },
        approvedBy: inv.invitedBy,
        approvedAt: FieldValue.serverTimestamp()
      });
      tx.set(db.doc(`identityBindings/${compoundId(cid, 'partners', inv.partnerId, uid)}`), { uid, companyId: cid, legacyId: inv.partnerId });
    } else if (inv.type === 'platform_staff') {
      // 3) 링커엑스 운영팀 초대 수락: platformStaff 및 platformAccess 활성화
      const pStaffRef = db.doc(`platformStaff/${inv.staffId}`);
      const pStaffDoc = await tx.get(pStaffRef);
      if (pStaffDoc.exists && pStaffDoc.data().linkedUid && pStaffDoc.data().linkedUid !== uid) {
        throw new HttpsError('already-exists', '이미 다른 계정에 연결된 운영팀 직원 카드입니다.');
      }

      tx.set(pStaffRef, {
        accountStatus: 'linked',
        linkedUid: uid,
        linkedEmail: account.email,
        linkedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      tx.set(platformRef(uid), {
        status: 'active',
        role: inv.role,
        staffId: inv.staffId,
        name: inv.staffName || account.displayName || '운영자',
        email: account.email,
        permissions: inv.permissions || {},
        approvedBy: inv.invitedBy,
        approvedAt: FieldValue.serverTimestamp()
      });

      tx.create(db.collection('authAudit').doc(), {
        actor: uid,
        target: inv.staffId,
        targetEmail: account.email,
        action: 'acceptPlatformStaffInvitation',
        role: inv.role,
        at: FieldValue.serverTimestamp()
      });
    }

    tx.update(invRef, {
      status: 'accepted',
      acceptedBy: uid,
      acceptedAt: FieldValue.serverTimestamp()
    });
  });

  return { ok: true, status: 'accepted' };
});

// ─────────────────────────────────────────────────────────────
// 6. 회원사 간 링커 연결 요청 (두 회원사 B2B 거래관계 연결)
// ─────────────────────────────────────────────────────────────
export const requestCompanyLink = onCall(opts, async req => {
  const account = await identity(req);
  const fromCid = id(req.data?.fromCompanyId);
  const toCid = id(req.data?.toCompanyId);
  const partnerId = id(req.data?.partnerId);

  const [fromM, fromC, toC] = await Promise.all([
    membershipRef(account.uid, fromCid).get(),
    db.doc(`companies/${fromCid}`).get(),
    db.doc(`companies/${toCid}`).get()
  ]);
  if (!active(fromM.data()) || fromM.data().role !== 'tenant_admin' || !active(fromC.data())) {
    throw new HttpsError('permission-denied', '회사 관리자만 회원사 연결을 요청할 수 있습니다.');
  }
  if (!active(toC.data())) {
    throw new HttpsError('not-found', '연결 대상 회원사를 찾을 수 없습니다.');
  }
  if (fromCid === toCid) throw new HttpsError('invalid-argument', '동일한 회원사끼리는 연결할 수 없습니다.');

  const linkRef = db.collection('companyLinks').doc();
  await linkRef.set({
    id: linkRef.id,
    fromCompanyId: fromCid,
    fromCompanyName: fromC.data().name || fromCid,
    toCompanyId: toCid,
    toCompanyName: toC.data().name || toCid,
    partnerId,
    requestedBy: account.uid,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp()
  });

  return { ok: true, linkId: linkRef.id };
});

// ─────────────────────────────────────────────────────────────
// 7. 회원사 간 링커 연결 수락 (상대 회사 관리자 수락)
// ─────────────────────────────────────────────────────────────
export const acceptCompanyLink = onCall(opts, async req => {
  const account = await identity(req);
  const linkId = id(req.data?.linkId);
  const linkRef = db.doc(`companyLinks/${linkId}`);

  await db.runTransaction(async tx => {
    const lDoc = await tx.get(linkRef);
    if (!lDoc.exists) throw new HttpsError('not-found', '연결 요청을 찾을 수 없습니다.');
    const link = lDoc.data();
    if (link.status !== 'pending') throw new HttpsError('failed-precondition', '이미 처리되었거나 만료된 요청입니다.');

    // 수락하는 쪽 회사의 관리자 확인
    const toM = await tx.get(membershipRef(account.uid, link.toCompanyId));
    if (!active(toM.data()) || toM.data().role !== 'tenant_admin') {
      throw new HttpsError('permission-denied', '연결 대상 회사의 관리자만 수락할 수 있습니다.');
    }

    // 양사 거래처 문서에 linkedCompanyId 상호 기록
    // 1) 요청자의 거래처 문서 업데이트
    if (link.partnerId) {
      const pRef = db.doc(`companies/${link.fromCompanyId}/partners/${link.partnerId}`);
      const pDoc = await tx.get(pRef);
      if (pDoc.exists) {
        tx.update(pRef, { linkedCompanyId: link.toCompanyId, linkStatus: 'linked' });
      }
    }

    // 2) 수락자의 거래처(또는 매입처) 문서 업데이트
    const matchingPartnerId = req.data?.matchingPartnerId;
    if (matchingPartnerId) {
      const toPRef = db.doc(`companies/${link.toCompanyId}/partners/${id(matchingPartnerId)}`);
      const toPDoc = await tx.get(toPRef);
      if (toPDoc.exists) {
        tx.update(toPRef, { linkedCompanyId: link.fromCompanyId, linkStatus: 'linked' });
      }
    }

    tx.update(linkRef, {
      status: 'active',
      acceptedBy: account.uid,
      acceptedAt: FieldValue.serverTimestamp()
    });
  });

  return { ok: true, status: 'active' };
});

/**
 * 8. 개인정보 처리위탁 합의서 동의 기록 (회사 관리자 전용)
 */
export const recordDpaAgreement = onCall(opts, async req => {
  const account = await identity(req);
  const cid = id(req.data?.companyId);
  if (!cid) throw new HttpsError('invalid-argument', 'companyId is required');

  const mDoc = await membershipRef(account.uid, cid).get();
  if (!active(mDoc.data()) || mDoc.data().role !== 'tenant_admin') {
    throw new HttpsError('permission-denied', '회사 관리자만 개인정보 처리위탁 합의에 동의할 수 있습니다.');
  }

  const dpaRef = db.doc(`companies/${cid}/compliance/dpa`);
  const record = {
    companyId: cid,
    agreedByUid: account.uid,
    agreedByEmail: account.email || '',
    dpaVersion: req.data?.dpaVersion || 'v1.0-draft',
    status: 'active',
    agreedAt: FieldValue.serverTimestamp()
  };

  await dpaRef.set(record, { merge: true });
  return { ok: true, dpaVersion: record.dpaVersion };
});

/**
 * 9. 유료 구독 계약 체결 기록 (회사 관리자 전용)
 */
export const recordSubscriptionAgreement = onCall(opts, async req => {
  const account = await identity(req);
  const cid = id(req.data?.companyId);
  if (!cid) throw new HttpsError('invalid-argument', 'companyId is required');

  const mDoc = await membershipRef(account.uid, cid).get();
  if (!active(mDoc.data()) || mDoc.data().role !== 'tenant_admin') {
    throw new HttpsError('permission-denied', '회사 관리자만 유료 구독 계약을 체결할 수 있습니다.');
  }

  const subRef = db.doc(`companies/${cid}/compliance/subscription`);
  const record = {
    companyId: cid,
    companyName: req.data?.companyName || cid,
    agreedByUid: account.uid,
    agreedByEmail: account.email || '',
    contractVersion: req.data?.contractVersion || 'v1.0-draft',
    planName: req.data?.planName || '스탠다드 플랜',
    price: req.data?.price || '33,000원',
    billingCycle: req.data?.billingCycle || '월간',
    pricingSnapshot: req.data?.pricingSnapshot || {},
    status: 'active',
    agreedAt: FieldValue.serverTimestamp()
  };

  await subRef.set(record, { merge: true });
  return { ok: true, contractVersion: record.contractVersion };
});

/**
 * 10. 회원사 컴플라이언스 및 계약 상태 조회
 */
export const getCompanyComplianceStatus = onCall(opts, async req => {
  const account = await identity(req);
  const cid = id(req.data?.companyId);
  if (!cid) throw new HttpsError('invalid-argument', 'companyId is required');

  const mDoc = await membershipRef(account.uid, cid).get();
  if (!active(mDoc.data())) {
    throw new HttpsError('permission-denied', '해당 회사의 소속 회원만 조회할 수 있습니다.');
  }

  const dpaDoc = await db.doc(`companies/${cid}/compliance/dpa`).get();
  const subDoc = await db.doc(`companies/${cid}/compliance/subscription`).get();

  return {
    ok: true,
    dpa: dpaDoc.exists ? dpaDoc.data() : null,
    subscription: subDoc.exists ? subDoc.data() : null
  };
});
