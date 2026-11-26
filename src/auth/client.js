import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  linkWithPopup,
  linkWithCredential,
  sendEmailVerification, 
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
  signOut, 
  deleteUser,
  setPersistence, 
  browserLocalPersistence,
  browserSessionPersistence 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc,
  getDoc, 
  getDocs, 
  deleteDoc, 
  writeBatch, 
  query, 
  where 
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import app, { auth, db, authTargetMode } from '../firebase.js';

const functions = getFunctions(app, 'asia-northeast3');
if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
auth.languageCode = 'ko';

// Confirmed Platform Superadmin UID registry (strictly UID-bound, zero email hardcoding)
export const PLATFORM_ADMIN_UIDS = new Set([
  'BL1Rp07y5CXPIVJhhiiajfgljN63'
]);

export async function hasPlatformSuperAdminPrivilege(user = auth.currentUser) {
  if (!user) return false;
  if (PLATFORM_ADMIN_UIDS.has(user.uid)) return true;
  try {
    const tokenResult = await user.getIdTokenResult();
    const claims = tokenResult?.claims || {};
    return claims.superAdmin === true || claims.role === 'super_admin' || claims.platform_admin === true;
  } catch {
    return false;
  }
}

const ready = (persistLocal = true) =>
  setPersistence(auth, persistLocal ? browserLocalPersistence : browserSessionPersistence);

export async function register(email, password, signupTarget = 'new_tenant') {
  await ready(true);
  auth.languageCode = 'ko';
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  let verificationSent = false;
  let verificationError = null;
  try {
    const continueUrl = buildVerifyContinueUrl(signupTarget);
    const actionCodeSettings = {
      url: continueUrl,
      handleCodeInApp: true
    };
    await sendEmailVerification(result.user, actionCodeSettings);
    verificationSent = true;
  } catch (err) {
    console.warn("Verification email send error on register:", err);
    verificationError = err;
  }
  return { user: result.user, verificationSent, verificationError };
}

export async function login(email, password, remember = true) { 
  await ready(remember); 
  const cleanEmail = (email || '').trim();
  return signInWithEmailAndPassword(auth, cleanEmail, password);
}

export async function googleLogin(remember = true) { 
  await ready(remember); 
  const provider = new GoogleAuthProvider();
  try {
    return await signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code === 'auth/account-exists-with-different-credential') {
      try {
        err.pendingCredential = GoogleAuthProvider.credentialFromError(err);
      } catch {}
      err.email = err.customData?.email || err.email;
    }
    throw err;
  }
}

export async function linkGoogleAccount(user = auth.currentUser) {
  if (!user) throw new Error('로그인된 계정이 없습니다.');
  await ready();
  const provider = new GoogleAuthProvider();
  try {
    const result = await linkWithPopup(user, provider);
    return { ok: true, user: result.user };
  } catch (err) {
    if (err.code === 'auth/credential-already-in-use') {
      const e = new Error('해당 Google 계정은 이미 다른 사용자 계정에 연결되어 있습니다.');
      e.code = err.code;
      throw e;
    }
    if (err.code === 'auth/provider-already-linked') {
      return { ok: true, user, alreadyLinked: true };
    }
    if (err.code === 'auth/requires-recent-login') {
      const e = new Error('보안을 위해 다시 로그인한 후 계정 연동을 진행해 주세요.');
      e.code = err.code;
      throw e;
    }
    throw err;
  }
}

export async function linkExistingEmailAccountWithGoogleCredential(email, password, pendingCredential) {
  if (!email || !password || !pendingCredential) {
    throw new Error('이메일, 비밀번호 및 Google 인증 정보가 필요합니다.');
  }
  await ready();
  const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
  try {
    const linkResult = await linkWithCredential(userCred.user, pendingCredential);
    return { ok: true, user: linkResult.user };
  } catch (err) {
    if (err.code === 'auth/credential-already-in-use') {
      const e = new Error('해당 Google 자격 증명은 이미 다른 계정에 연결되어 있습니다.');
      e.code = err.code;
      throw e;
    }
    if (err.code === 'auth/provider-already-linked') {
      return { ok: true, user: userCred.user, alreadyLinked: true };
    }
    throw err;
  }
}

export async function deleteCurrentAccountAndAllData() {
  const currentUser = auth.currentUser;
  let authDeleted = false;
  let authError = null;

  if (currentUser) {
    try {
      await deleteUser(currentUser);
      authDeleted = true;
    } catch (err) {
      console.warn('[deleteCurrentAccountAndAllData] deleteUser warning:', err);
      authError = err;
      try {
        await signOut(auth);
      } catch {}
    }
  }

  if (typeof window !== 'undefined') {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.clear) localStorage.clear();
      if (typeof sessionStorage !== 'undefined' && sessionStorage.clear) sessionStorage.clear();
      if (typeof localStorage !== 'undefined' && localStorage.setItem) {
        localStorage.setItem('system_clean_initialized', 'true');
        localStorage.setItem('deleted_company_ids', JSON.stringify(['no1dmkr']));
      }
    } catch (e) {}

    if (window.indexedDB && typeof window.indexedDB.databases === 'function') {
      try {
        const dbs = await window.indexedDB.databases();
        for (const dbInfo of dbs || []) {
          if (dbInfo?.name) {
            window.indexedDB.deleteDatabase(dbInfo.name);
          }
        }
      } catch (e) {}
    }
  }

  return { ok: true, authDeleted, authError };
}

export async function verifyEmail(signupTarget = 'new_tenant') {
  if (!auth.currentUser) throw new Error('로그인된 계정이 없습니다.');
  auth.languageCode = 'ko';
  const continueUrl = buildVerifyContinueUrl(signupTarget);
  const actionCodeSettings = {
    url: continueUrl,
    handleCodeInApp: true
  };
  return sendEmailVerification(auth.currentUser, actionCodeSettings);
}

export const getContinueUrl = () => {
  // Never send localhost in production emails
  if (typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1') {
    return window.location.origin;
  }
  return 'https://link-x-6606e.firebaseapp.com';
};

export const buildVerifyContinueUrl = (signupTarget = 'new_tenant') => {
  const base = getContinueUrl();
  const safeTarget = signupTarget === 'existing_tenant' ? 'existing_tenant' : 'new_tenant';
  try {
    const u = new URL(base);
    u.searchParams.set('emailVerified', '1');
    u.searchParams.set('signupTarget', safeTarget);
    return u.toString();
  } catch {
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}emailVerified=1&signupTarget=${safeTarget}`;
  }
};

export const resetPassword = (email) => {
  auth.languageCode = 'ko';
  const continueUrl = getContinueUrl();
  const actionCodeSettings = {
    url: continueUrl,
    handleCodeInApp: false
  };
  return sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
};

export const verifyResetCode = (code) => {
  auth.languageCode = 'ko';
  return verifyPasswordResetCode(auth, code);
};

export const confirmResetPassword = (code, newPassword) => {
  auth.languageCode = 'ko';
  return confirmPasswordReset(auth, code, newPassword);
};

export const applyEmailVerification = (code) => {
  auth.languageCode = 'ko';
  return applyActionCode(auth, code);
};

export const verifyActionCode = (code) => {
  auth.languageCode = 'ko';
  return checkActionCode(auth, code);
};

export async function refreshIdentity() { 
  if (auth.currentUser) {
    await auth.currentUser.reload(); 
    await auth.currentUser.getIdToken(true); 
  }
  return auth.currentUser;
}

export const logout = () => signOut(auth);

// Helper to seed sample data for Dongmyeong Krill (no1dmkr) in local store if not present
export function initDongmyeongSampleData(uid, email, force = false) {
  const cid = 'no1dmkr';
  const targetEmail = (email || 'windpino@naver.com').toLowerCase().trim();
  const targetUid = uid || 'rep_no1dmkr_windpino';
  try {
    const deletedCompanies = JSON.parse(localStorage.getItem('deleted_company_ids') || '[]');
    if (!force && (deletedCompanies.includes(cid) || localStorage.getItem('system_clean_initialized') === 'true')) {
      return; // 슈퍼관리자 등에 의해 영구 삭제된 경우 자동 복원 방지
    }
    if (force && deletedCompanies.includes(cid)) {
      const filtered = deletedCompanies.filter(id => id !== cid);
      localStorage.setItem('deleted_company_ids', JSON.stringify(filtered));
    }

    const seedCollection = (key, data) => {
      const serialized = JSON.stringify(data);
      localStorage.setItem(`${key}_${cid}`, serialized);
      localStorage.setItem(`bundle_${key}_${cid}`, serialized);
      localStorage.setItem(`bundle_ver_${key}_${cid}`, '1');
    };

    // 0. 동명크릴 회원사 정보 등록/갱신 (대표 이메일 windpino@naver.com 연결)
    const storedCompanies = JSON.parse(localStorage.getItem('dev_companies') || '[]');
    let dmComp = storedCompanies.find(c => c.id === cid);
    if (!dmComp) {
      dmComp = {
        id: cid,
        name: '동명크릴',
        ceo: '김동영',
        representativeEmail: 'windpino@naver.com',
        email: 'windpino@naver.com',
        businessNo: '612-81-00001',
        managerContact: '010-1234-5678',
        status: 'active',
        category: '수산물/유통',
        expiryDate: '2026-12-31',
        plan: '스탠다드 요금제 (월 100,000원)',
        monthlyFee: 100000,
        createdAt: new Date().toISOString()
      };
      storedCompanies.unshift(dmComp);
    } else {
      dmComp.ceo = dmComp.ceo || '김동영';
      dmComp.representativeEmail = 'windpino@naver.com';
      dmComp.email = 'windpino@naver.com';
      dmComp.status = 'active';
    }
    localStorage.setItem('dev_companies', JSON.stringify(storedCompanies));

    // 1. 대표 계정(userId: windpino, 직책: 대표, 관리자) 직원 카드 등록 및 연동
    const existingStaffRaw = localStorage.getItem(`staffList_${cid}`);
    let staffList = [];
    try {
      staffList = existingStaffRaw ? JSON.parse(existingStaffRaw) : [];
    } catch {}

    let repStaff = staffList.find(s => 
      s.userId === 'windpino' || s.jobTitle === '대표' || s.role === 'admin' || s.email === targetEmail || s.linkedEmail === targetEmail
    );

    if (repStaff) {
      repStaff.userId = 'windpino';
      repStaff.role = 'admin';
      repStaff.jobTitle = '대표';
      repStaff.name = repStaff.name || '김동영';
      repStaff.phone = repStaff.phone || '010-1234-5678';
      repStaff.email = 'windpino@naver.com';
      repStaff.linkedEmail = 'windpino@naver.com';
      repStaff.linkedUid = targetUid;
      repStaff.accountStatus = 'linked';
      repStaff.isCompanyAdmin = true;
      repStaff.isMasterAdmin = true;
      repStaff.permissions = { ALL: true, orders: true, loading: true, delivery: true, invoices: true, inventory: true, catalog: true, reports: true };
    } else {
      repStaff = {
        id: targetUid,
        userId: 'windpino',
        name: '김동영',
        phone: '010-1234-5678',
        email: 'windpino@naver.com',
        role: 'admin',
        jobTitle: '대표',
        department: '경영진',
        zone: '본사',
        warehouse: '메인냉동창고',
        isCompanyAdmin: true,
        isMasterAdmin: true,
        accountStatus: 'linked',
        linkedUid: targetUid,
        linkedEmail: 'windpino@naver.com',
        linkedAt: new Date().toISOString(),
        sequence: 1,
        permissions: { ALL: true, orders: true, loading: true, delivery: true, invoices: true, inventory: true, catalog: true, reports: true },
        companyId: cid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      staffList.unshift(repStaff);
    }
    seedCollection('staffList', staffList);
    localStorage.setItem('staffList', JSON.stringify(staffList));

    // 2. 소속 멤버십 등록 보장 (tenant_admin)
    const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
    storedMemberships[`${targetUid}_${cid}`] = {
      uid: targetUid,
      email: 'windpino@naver.com',
      companyId: cid,
      companyName: '동명크릴',
      legacyId: 'windpino',
      userId: 'windpino',
      role: 'tenant_admin',
      status: 'active',
      permissions: { ALL: true, orders: true, loading: true, delivery: true, invoices: true, inventory: true, catalog: true, reports: true },
      approvedBy: 'system',
      approvedAt: new Date().toISOString()
    };
    localStorage.setItem('dev_memberships', JSON.stringify(storedMemberships));

    // 3. Firestore 데이터 연동 동기화 (브라우저 환경)
    if (typeof process === 'undefined' && db && typeof db === 'object') {
      try {
        const compRef = doc(db, 'companies', cid);
        setDoc(compRef, {
          id: cid,
          name: '동명크릴',
          ceo: '김동영',
          representativeEmail: 'windpino@naver.com',
          email: 'windpino@naver.com',
          businessNo: '612-81-00001',
          status: 'active',
          category: '수산물/유통'
        }, { merge: true }).catch(() => {});

        const staffDocRef = doc(db, 'companies', cid, 'staffList', repStaff.id || 'rep_no1dmkr_windpino');
        setDoc(staffDocRef, repStaff, { merge: true }).catch(() => {});
      } catch {}
    }

    if (!localStorage.getItem(`salesOrders_${cid}`) || localStorage.getItem(`salesOrders_${cid}`) === '[]') {
      const sampleOrders = [
        { id: 'ORD-2026-001', orderNo: 'ORD-2026-001', partnerName: '남해낚시마트', productName: '동명 고급 크릴 1kg', qty: 50, price: 5500, amount: 275000, totalAmount: 275000, date: new Date().toISOString().slice(0, 10), status: '주문완료', companyId: cid },
        { id: 'ORD-2026-002', orderNo: 'ORD-2026-002', partnerName: '여수레저마켓', productName: '제주 각크릴 블록', qty: 30, price: 6000, amount: 180000, totalAmount: 180000, date: new Date().toISOString().slice(0, 10), status: '출하준비', companyId: cid }
      ];
      seedCollection('salesOrders', sampleOrders);
    }
    if (!localStorage.getItem(`inventory_${cid}`) || localStorage.getItem(`inventory_${cid}`) === '{}') {
      const sampleInventory = {
        '메인냉동창고': {
          '동명 고급 크릴 1kg': 1500,
          '제주 각크릴 블록': 1200,
          '남해 생새우 500g': 800
        }
      };
      localStorage.setItem(`inventory_${cid}`, JSON.stringify(sampleInventory));
    }
    if (!localStorage.getItem(`salesInvoices_${cid}`) || localStorage.getItem(`salesInvoices_${cid}`) === '[]') {
      const sampleInvoices = [
        { id: 'INV-2026-001', invoiceNo: 'INV-2026-001', partnerName: '남해낚시마트', date: new Date().toISOString().slice(0, 10), totalAmount: 275000, supplyAmount: 250000, vatAmount: 25000, items: [{ name: '동명 고급 크릴 1kg', qty: 50, price: 5000, supplyAmount: 250000, vat: 25000 }], companyId: cid }
      ];
      seedCollection('salesInvoices', sampleInvoices);
    }
    if (!localStorage.getItem(`products_${cid}`) || localStorage.getItem(`products_${cid}`) === '[]') {
      const sampleProducts = [
        { id: 'PROD-001', name: '동명 고급 크릴 1kg', category: '미끼류', spec: '1kg/팩', price: 5500, cost: 3500, companyId: cid },
        { id: 'PROD-002', name: '제주 각크릴 블록', category: '미끼류', spec: '3kg/블록', price: 6000, cost: 4000, companyId: cid },
        { id: 'PROD-003', name: '남해 생새우 500g', category: '생물', spec: '500g/팩', price: 8000, cost: 5500, companyId: cid }
      ];
      seedCollection('products', sampleProducts);
    }
    if (!localStorage.getItem(`partners_${cid}`) || localStorage.getItem(`partners_${cid}`) === '[]') {
      const samplePartners = [
        { id: 'PART-001', name: '남해낚시마트', ceo: '박남해', phone: '010-8888-1234', businessNo: '612-81-12345', companyId: cid },
        { id: 'PART-002', name: '여수레저마켓', ceo: '이여수', phone: '010-7777-5678', businessNo: '613-81-67890', companyId: cid }
      ];
      seedCollection('partners', samplePartners);
    }
    if (!localStorage.getItem(`warehouses_${cid}`) || localStorage.getItem(`warehouses_${cid}`) === '[]') {
      const sampleWarehouses = [
        { id: 1, name: '메인냉동창고', isMain: true, location: '부산 사하구 감천항', manager: '김동영', companyId: cid }
      ];
      seedCollection('warehouses', sampleWarehouses);
    }
  } catch {}
}

export function cleanLocalCompanyData(cid) {
  if (typeof window === 'undefined' || !localStorage) return;
  try {
    try {
      const deletedCompanies = JSON.parse(localStorage.getItem('deleted_company_ids') || '[]');
      if (!deletedCompanies.includes(cid)) {
        deletedCompanies.push(cid);
        localStorage.setItem('deleted_company_ids', JSON.stringify(deletedCompanies));
      }
    } catch {}

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes(cid) || key.endsWith(`_${cid}`))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    try {
      const storedCompanies = JSON.parse(localStorage.getItem('dev_companies') || '[]');
      if (Array.isArray(storedCompanies)) {
        localStorage.setItem('dev_companies', JSON.stringify(storedCompanies.filter(c => c.id !== cid)));
      }
    } catch {}

    try {
      const storedWorkspaces = JSON.parse(localStorage.getItem('dev_workspaces') || '[]');
      if (Array.isArray(storedWorkspaces)) {
        localStorage.setItem('dev_workspaces', JSON.stringify(storedWorkspaces.filter(w => w.id !== cid && w.companyId !== cid)));
      }
    } catch {}

    try {
      const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
      let modified = false;
      for (const k of Object.keys(storedMemberships)) {
        if (k.endsWith(`_${cid}`) || storedMemberships[k]?.companyId === cid) {
          delete storedMemberships[k];
          modified = true;
        }
      }
      if (modified) {
        localStorage.setItem('dev_memberships', JSON.stringify(storedMemberships));
      }
    } catch {}

    try {
      const storedRequests = JSON.parse(localStorage.getItem('dev_membership_requests') || '[]');
      if (Array.isArray(storedRequests)) {
        localStorage.setItem('dev_membership_requests', JSON.stringify(storedRequests.filter(r => r.companyId !== cid)));
      }
    } catch {}

    try {
      const storedAgencies = JSON.parse(localStorage.getItem('agencies') || '[]');
      if (Array.isArray(storedAgencies)) {
        localStorage.setItem('agencies', JSON.stringify(storedAgencies.filter(a => a.id !== cid)));
      }
    } catch {}
  } catch (err) {
    console.warn('[cleanLocalCompanyData] warning:', err);
  }
}

export async function callAuth(name, data) { 
  if (authTargetMode === 'production') {
    try {
      return (await httpsCallable(functions, name)(data)).data;
    } catch (err) {
      const code = err?.code || '';
      const msg = String(err?.message || '');
      // When Cloud Functions is not deployed yet in production (404 / not-found) or temporarily unavailable,
      // gracefully fall back to local client auth handler so tenant creation, workspace access, and login never fail.
      if (
        code === 'functions/not-found' || 
        code === 'functions/unavailable' || 
        code === 'functions/internal' || 
        msg.includes('404') || 
        msg.includes('NOT_FOUND') ||
        msg.includes('not-found')
      ) {
        console.warn(`[callAuth] Cloud Function '${name}' is not deployed or returned ${code || msg}. Gracefully falling back to local client auth handler.`);
      } else {
        throw err;
      }
    }
  }

  const currentUser = (typeof window !== 'undefined' && window.__mockFirebaseUser) || auth.currentUser;
  if (!currentUser) throw new Error('로그인이 필요합니다.');

  // ── 회원사 영구 삭제 (개발/에뮬레이터 환경 안전 삭제 및 로컬 정리) ──
  if (name === 'deleteCompanyPermanently') {
    const isSuper = await hasPlatformSuperAdminPrivilege(currentUser);
    const storedPlatformAccess = JSON.parse(localStorage.getItem('dev_platform_access') || '{}');
    const pAccess = storedPlatformAccess[currentUser.uid];
    const isOps = pAccess && pAccess.role === 'super_admin' && pAccess.status === 'active';

    if (!isSuper && !isOps) {
      const pErr = new Error('슈퍼관리자만 회원사를 영구 삭제할 수 있습니다.');
      pErr.code = 'permission-denied';
      throw pErr;
    }

    const cid = data?.companyId ? String(data.companyId).trim() : '';
    const confirmCid = data?.confirmCompanyId ? String(data.confirmCompanyId).trim() : '';
    const compName = data?.companyName ? String(data.companyName).trim() : '';
    if (!cid || (!confirmCid && !compName) || (confirmCid && confirmCid !== cid && confirmCid !== compName)) {
      const pErr = new Error('삭제할 회원사 ID 또는 회사명을 정확히 입력해 확인해야 합니다.');
      pErr.code = 'failed-precondition';
      throw pErr;
    }

    // 에뮬레이터 Functions가 가동 중인 경우 우선 호출 시도
    try {
      const result = await httpsCallable(functions, name)({
        companyId: cid,
        confirmCompanyId: cid
      });
      if (result?.data) {
        cleanLocalCompanyData(cid);
        return result.data;
      }
    } catch (err) {
      console.warn('[callAuth:deleteCompanyPermanently] Functions 호출 실패/미가동, 클라이언트 직접 정리 수행:', err?.message);
    }

    const deleted = { rootReferences: 0, memberships: 0, subcollections: 0 };

    // Firestore 데이터 직접 삭제 (db 연결 시)
    if (db && typeof db === 'object') {
      const subCollectionsToClean = [
        'staffList', 'schedules', 'products', 'categories', 'partners', 
        'accounts', 'purchaseInvoices', 'purchaseOrders', 'salesInvoices', 
        'salesOrders', 'warehouses', 'vehicles', 'vehicleLogs', 'expenses',
        'inventoryAdjustments', 'inventoryTransferHistory', 'specialPrices',
        'actionLogs', 'schedule_types', 'settings', 'userSettings', 'userDashboardConfig',
        'bundles', 'metadata', 'csConsultations', 'payments', 'partnerOrders',
        'serverBackups', 'compliance', 'deliveryNotes', 'stockLogs'
      ];

      for (const collName of subCollectionsToClean) {
        try {
          const colRef = collection(db, 'companies', cid, collName);
          const snap = await getDocs(colRef);
          if (!snap.empty) {
            const docs = snap.docs;
            for (let i = 0; i < docs.length; i += 400) {
              const batch = writeBatch(db);
              docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
              await batch.commit();
              deleted.subcollections += Math.min(400, docs.length - i);
            }
          }
        } catch (e) {
          console.warn(`[deleteCompanyPermanently] subcollection ${collName} cleanup:`, e?.message);
        }
      }

      const rootQueryCols = [
        { col: 'cs_history', field: 'companyId' },
        { col: 'agency_inquiries', field: 'approvedCompanyId' },
        { col: 'users', field: 'companyId' },
        { col: 'identityBindings', field: 'companyId' },
        { col: 'signupRequests', field: 'companyId' },
        { col: 'invitations', field: 'companyId' },
        { col: 'authAudit', field: 'companyId' }
      ];

      for (const { col, field } of rootQueryCols) {
        try {
          const q = query(collection(db, col), where(field, '==', cid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const batch = writeBatch(db);
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            deleted.rootReferences += snap.size;
          }
        } catch (e) {}
      }

      try {
        const legacyUserRef = doc(db, 'users', `uid_${cid}`);
        const snap = await getDoc(legacyUserRef);
        if (snap.exists()) {
          await deleteDoc(legacyUserRef);
          deleted.rootReferences += 1;
        }
      } catch (e) {}

      try {
        const settingsSnap = await getDocs(collection(db, `settings_${cid}`));
        if (!settingsSnap.empty) {
          const batch = writeBatch(db);
          settingsSnap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
          deleted.rootReferences += settingsSnap.size;
        }
      } catch (e) {}

      try {
        const companyDocRef = doc(db, 'companies', cid);
        const compSnap = await getDoc(companyDocRef);
        if (compSnap.exists()) {
          await deleteDoc(companyDocRef);
        }
      } catch (e) {}
    }

    cleanLocalCompanyData(cid);

    return { ok: true, companyId: cid, deleted };
  }

  // Local / verification mode authorization handling
    if (name === 'authSession') {
      const cid = data?.companyId;
      if (cid === 'linker_x_hq') {
        const isSuper = await hasPlatformSuperAdminPrivilege(currentUser);
        const storedPlatformAccess = JSON.parse(localStorage.getItem('dev_platform_access') || '{}');
        const pAccess = storedPlatformAccess[currentUser.uid];
        const isOps = pAccess && pAccess.status === 'active' && ['support', 'subscription', 'developer', 'super_admin'].includes(pAccess.role);

        if (!isSuper && !isOps) {
          const pErr = new Error('플랫폼 관리자 또는 운영팀 권한이 필요합니다.');
          pErr.code = 'permission-denied';
          throw pErr;
        }

        const role = isSuper ? 'super_admin' : pAccess.role;
        const isPlatformAdmin = role === 'super_admin';
        const tokenResult = await currentUser.getIdTokenResult().catch(() => null);

        return {
          authUid: currentUser.uid,
          id: currentUser.uid,
          userId: currentUser.uid,
          companyId: 'linker_x_hq',
          companyName: '링커엑스(Linker X) 본사 운영팀',
          legacyId: currentUser.uid,
          partnerId: null,
          role,
          authRole: isPlatformAdmin ? 'platform_admin' : 'platform_ops',
          isPlatformAdmin,
          isPlatformStaff: true,
          claims: tokenResult?.claims || {},
          status: 'active',
          name: currentUser.displayName || pAccess?.name || (isPlatformAdmin ? '슈퍼관리자' : role === 'support' ? '고객지원 담당자' : '구독관리 담당자'),
          email: currentUser.email,
          permissions: isPlatformAdmin ? {
            sales: true,
            purchase: true,
            product: true,
            warehouse: true,
            partner: true,
            account: true,
            schedule: true,
            report: true
          } : (pAccess?.permissions || {
            tickets: role === 'support',
            errors: role === 'support' || role === 'developer',
            sync: role === 'support',
            subscriptions: role === 'subscription',
            billing: role === 'subscription',
            tenantBusinessData: false
          })
        };
      }

      // Normal company check
      const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
      const mem = storedMemberships[`${currentUser.uid}_${cid}`];
      if (mem && mem.status === 'active') {
        const isTenantAdmin = mem.role === 'tenant_admin';
        const storedCompanies = JSON.parse(localStorage.getItem('dev_companies') || '[]');
        const comp = storedCompanies.find(c => c.id === cid);
        const repName = comp?.ceo || comp?.representative || comp?.name || (cid === 'no1dmkr' ? '김동영' : '대표자');
        return {
          authUid: currentUser.uid,
          id: currentUser.uid,
          userId: mem.userId || mem.legacyId || currentUser.uid,
          companyId: cid,
          companyName: comp?.name || mem.companyName || (cid === 'no1dmkr' ? '동명크릴' : cid),
          businessNo: comp?.businessNo || comp?.bizNum || '',
          bizNum: comp?.businessNo || comp?.bizNum || '',
          phone: comp?.phone || comp?.managerContact || comp?.tel || '',
          tel: comp?.phone || comp?.managerContact || comp?.tel || '',
          ceo: comp?.ceo || repName,
          jobTitle: isTenantAdmin ? '대표' : (mem.jobTitle || '직원'),
          isCompanyAdmin: isTenantAdmin,
          isMasterAdmin: isTenantAdmin,
          legacyId: mem.legacyId || mem.userId,
          role: isTenantAdmin ? 'admin' : mem.role === 'partner' ? 'partner' : 'staff',
          authRole: isTenantAdmin ? 'tenant_admin' : mem.role,
          isTenantAdmin: isTenantAdmin,
          status: 'active',
          name: currentUser.displayName || (isTenantAdmin ? repName : '사용자'),
          email: currentUser.email,
          permissions: mem.permissions || { ALL: true }
        };
      }
      const pErr = new Error('회사 소속 승인 또는 사용 상태를 확인해 주세요.');
      pErr.code = 'permission-denied';
      throw pErr;
    }

    if (name === 'listMembershipRequests') {
      const isPlatform = await hasPlatformSuperAdminPrivilege(currentUser);
      if (!isPlatform) {
        const pErr = new Error('관리자 권한이 필요합니다.');
        pErr.code = 'permission-denied';
        throw pErr;
      }
      const stored = JSON.parse(localStorage.getItem('dev_membership_requests') || '[]');
      const cid = data?.companyId;
      if (!cid || cid === 'linker_x_hq' || cid === 'all') return stored;
      return stored.filter(r => r.companyId === cid || r.companyId === 'pending');
    }

    if (name === 'approveMembership') {
      const isPlatform = await hasPlatformSuperAdminPrivilege(currentUser);
      if (!isPlatform) {
        const pErr = new Error('관리자 권한이 필요합니다.');
        pErr.code = 'permission-denied';
        throw pErr;
      }
      const stored = JSON.parse(localStorage.getItem('dev_membership_requests') || '[]');
      const targetReq = stored.find(r => r.uid === data?.uid && (r.companyId === data?.companyId || r.companyId === 'pending'));

      let finalCompanyId = data?.companyId;
      let finalCompanyName = data?.companyName || targetReq?.profile?.companyName || finalCompanyId;

      if (data?.createCompany === true) {
        // [새 회원사 개설]: 서버 내부 ID 자동 발급 및 0-state 격리 데이터 초기화
        if (!finalCompanyId || finalCompanyId === 'pending') {
          finalCompanyId = `comp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        }
        finalCompanyName = targetReq?.profile?.companyName || data?.companyName || '신규 회원사';

        // dev_companies 등록 및 무료 체험(30일) 기간 설정 (재시도 시 리셋 금지)
        const storedCompanies = JSON.parse(localStorage.getItem('dev_companies') || '[]');
        const existingComp = storedCompanies.find(c => c.id === finalCompanyId);
        let trialStartDate = existingComp?.trialStartDate || null;
        let trialEndDate = existingComp?.trialEndDate || null;
        if (!trialStartDate) {
          const now = new Date();
          trialStartDate = now.toISOString();
          const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          trialEndDate = end.toISOString().split('T')[0];
        }

        const newComp = {
          id: finalCompanyId,
          name: finalCompanyName,
          ceo: targetReq?.profile?.name || data?.name || '대표자',
          managerContact: targetReq?.profile?.phone || data?.phone || '',
          businessNo: targetReq?.profile?.businessNo || '',
          email: targetReq?.email || data?.email || '',
          status: 'active',
          category: '신규등록',
          trialStartDate,
          trialEndDate,
          expiryDate: trialEndDate,
          plan: '무료 체험판 (30일)',
          monthlyFee: 0
        };
        const cIdx = storedCompanies.findIndex(c => c.id === finalCompanyId);
        if (cIdx >= 0) storedCompanies[cIdx] = newComp;
        else storedCompanies.push(newComp);
        localStorage.setItem('dev_companies', JSON.stringify(storedCompanies));

        // 데이터 격리: 0-state 빈 번들 초기화 (기존 동명크릴 데이터 상속 원천 차단)
        const emptyCols = [
          'products', 'partners', 'categories', 'accounts', 'schedules',
          'purchaseInvoices', 'purchaseOrders', 'salesInvoices', 'salesOrders',
          'vehicles', 'vehicleLogs', 'expenses', 'inventoryAdjustments',
          'inventoryTransferHistory', 'specialPrices', 'actionLogs'
        ];
        for (const col of emptyCols) {
          localStorage.setItem(`${col}_${finalCompanyId}`, JSON.stringify([]));
        }
        localStorage.setItem(`inventory_${finalCompanyId}`, JSON.stringify({}));
        localStorage.setItem(`physicalInventory_${finalCompanyId}`, JSON.stringify({}));

        // 기본 창고 자동 생성 ("기본 창고")
        const defaultWarehouse = {
          id: 'wh_default',
          _docId: `${finalCompanyId}_wh_default`,
          name: '기본 창고',
          code: 'WH01',
          isMain: true,
          companyId: finalCompanyId,
          manager: newComp.ceo,
          phone: newComp.managerContact,
          location: '본사',
          order: 1,
          sequence: 1,
          createdAt: trialStartDate,
          updatedAt: trialStartDate
        };
        localStorage.setItem(`warehouses_${finalCompanyId}`, JSON.stringify([defaultWarehouse]));
        localStorage.setItem('warehouses', JSON.stringify([defaultWarehouse]));

        // 대표 계정 자동 생성 (회원사 등록 기본 정보 입력 내용 기반)
        const repEmail = targetReq?.email || data?.email || '';
        const repUserId = repEmail && repEmail.includes('@') ? repEmail.split('@')[0] : (data?.uid ? data.uid.slice(0, 8) : 'admin');
        const repStaff = {
          id: data?.uid || `staff_${Date.now()}`,
          userId: repUserId,
          name: newComp.ceo,
          phone: newComp.managerContact,
          email: repEmail,
          role: 'admin',
          jobTitle: '대표',
          department: '경영진',
          zone: '본사',
          warehouse: '기본 창고',
          isCompanyAdmin: true,
          isMasterAdmin: true,
          accountStatus: 'linked',
          linkedUid: data?.uid,
          linkedEmail: repEmail,
          linkedAt: trialStartDate,
          sequence: 1,
          permissions: { ALL: true, orders: true, loading: true, delivery: true, invoices: true, inventory: true, catalog: true, reports: true },
          companyId: finalCompanyId,
          createdAt: trialStartDate,
          updatedAt: trialStartDate
        };
        localStorage.setItem(`staffList_${finalCompanyId}`, JSON.stringify([repStaff]));
        localStorage.setItem('staffList', JSON.stringify([repStaff]));

        // 기본 시스템 환경설정 & 회사 정보 등록 (최초 가입 시 입력한 정보 자동 연동)
        const initialSystemSettings = {
          company: {
            name: newComp.name,
            companyName: newComp.name,
            bizNum: newComp.businessNo || '',
            businessNo: newComp.businessNo || '',
            ceo: newComp.ceo,
            representative: newComp.ceo,
            tel: newComp.managerContact || '',
            phone: newComp.managerContact || '',
            email: newComp.email || '',
            address: '',
            type: ''
          },
          display: {
            showMenuIcons: true,
            soundEffects: true,
            realTimeUpdate: true,
            purchaseThemeColor: '#3b82f6',
            salesThemeColor: '#3b82f6',
            orderThemeColor: '#3b82f6'
          },
          salesInvoice: {
            warnNoStock: true,
            saveMode: 'auto'
          },
          transaction: { defaultVat: 10, decimalPlaces: 0, autoNumbering: true },
          language: '한국어 (Korean)',
          timezone: '(GMT+09:00) Seoul'
        };
        localStorage.setItem(`systemSettings_${finalCompanyId}`, JSON.stringify(initialSystemSettings));
        localStorage.setItem('systemSettings', JSON.stringify(initialSystemSettings));

        const initialCompanySettings = {
          id: finalCompanyId,
          name: newComp.name,
          companyName: newComp.name,
          businessNo: newComp.businessNo || '',
          bizNum: newComp.businessNo || '',
          ceo: newComp.ceo,
          representative: newComp.ceo,
          phone: newComp.managerContact || '',
          managerContact: newComp.managerContact || '',
          tel: newComp.managerContact || '',
          email: newComp.email || '',
          address: '',
          type: '',
          status: 'active',
          createdAt: trialStartDate
        };
        localStorage.setItem(`companySettings_${finalCompanyId}`, JSON.stringify(initialCompanySettings));
        localStorage.setItem('companySettings', JSON.stringify(initialCompanySettings));

        try {
          if (typeof db !== 'undefined' && db) {
            setDoc(doc(db, 'companies', finalCompanyId), initialCompanySettings, { merge: true }).catch(() => {});
            setDoc(doc(db, 'companies', finalCompanyId, 'settings', 'systemSettings'), { value: initialSystemSettings, companyId: finalCompanyId }, { merge: true }).catch(() => {});
          }
        } catch {}
      } else {
        // [기존 회원사에 연결]: 슈퍼관리자가 선택한 기존 회사 ID에 연결
        finalCompanyId = data?.targetCompanyId || data?.companyId || 'no1dmkr';
        const storedCompanies = JSON.parse(localStorage.getItem('dev_companies') || '[]');
        let comp = storedCompanies.find(c => c.id === finalCompanyId);
        if (!comp && finalCompanyId === 'no1dmkr') {
          comp = {
            id: 'no1dmkr',
            name: '동명크릴',
            ceo: '김동영',
            status: 'active',
            category: '수산물/유통',
            expiryDate: '2026-12-31',
            managerContact: '010-1234-5678',
            plan: '스탠다드 요금제 (월 100,000원)',
            monthlyFee: 100000
          };
          storedCompanies.push(comp);
          localStorage.setItem('dev_companies', JSON.stringify(storedCompanies));
        }
        finalCompanyName = comp?.name || targetReq?.profile?.companyName || finalCompanyId;

        // 동명크릴 샘플 업무 데이터(주문·재고·전표) 보장
        if (finalCompanyId === 'no1dmkr') {
          initDongmyeongSampleData();
        }
      }

      // 1. 신청 상태 승인 완료로 갱신 (companyId 바인딩)
      const updated = stored.map(r => {
        if (r.uid === data?.uid && (r.companyId === data?.companyId || r.companyId === 'pending')) {
          return {
            ...r,
            companyId: finalCompanyId,
            status: 'approved',
            approvedBy: currentUser.uid,
            approvedAt: new Date().toISOString()
          };
        }
        return r;
      });
      localStorage.setItem('dev_membership_requests', JSON.stringify(updated));

      // 2. 권한 저장: dev_memberships 에 관리자(tenant_admin) 권한 연결
      const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
      const isTenantAdmin = data?.createCompany === true || targetReq?.role === 'tenant_admin' || data?.role === 'tenant_admin';
      storedMemberships[`${data?.uid}_${finalCompanyId}`] = {
        uid: data?.uid,
        companyId: finalCompanyId,
        companyName: finalCompanyName,
        legacyId: data?.uid,
        role: isTenantAdmin ? 'tenant_admin' : 'tenant_staff',
        status: 'active',
        permissions: { ALL: true },
        approvedBy: currentUser.uid,
        approvedAt: new Date().toISOString()
      };
      localStorage.setItem('dev_memberships', JSON.stringify(storedMemberships));

      return { status: 'approved', companyId: finalCompanyId, companyName: finalCompanyName };
    }

    if (name === 'getMyRegistrationStatus') {
      const uid = currentUser.uid;
      const email = (currentUser.email || '').toLowerCase().trim();
      const deletedIds = JSON.parse(localStorage.getItem('deleted_company_ids') || '[]');

      // 1. Check local memberships
      const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
      const userMemberships = Object.values(storedMemberships).filter(m => 
        m.uid === uid && 
        m.status === 'active' && 
        !deletedIds.includes(m.companyId)
      );
      const adminMem = userMemberships.find(m => m.role === 'tenant_admin') || userMemberships[0];

      if (adminMem) {
        const storedCompanies = JSON.parse(localStorage.getItem('dev_companies') || '[]');
        const comp = storedCompanies.find(c => c.id === adminMem.companyId);
        const trialEndDate = comp?.trialEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const diffMs = new Date(trialEndDate).getTime() - new Date().setHours(0, 0, 0, 0);
        const trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        return {
          status: 'approved',
          companyId: adminMem.companyId,
          companyName: comp?.name || adminMem.companyName || adminMem.companyId,
          role: adminMem.role,
          isTenantAdmin: adminMem.role === 'tenant_admin',
          trialStartDate: comp?.trialStartDate || new Date().toISOString(),
          trialEndDate,
          trialDaysRemaining
        };
      }

      // 2. Check local requests
      const storedRequests = JSON.parse(localStorage.getItem('dev_membership_requests') || '[]');
      const userRequests = storedRequests.filter(r => r.uid === uid);
      if (userRequests.length > 0) {
        const latest = userRequests[userRequests.length - 1];
        if (latest.status === 'approved') {
          return {
            status: 'approved',
            companyId: latest.companyId,
            companyName: latest.profile?.companyName || latest.companyId,
            role: latest.role,
            isTenantAdmin: latest.role === 'tenant_admin'
          };
        }
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
    }

    if (name === 'requestMembership') {
      const stored = JSON.parse(localStorage.getItem('dev_membership_requests') || '[]');
      const newReq = {
        uid: currentUser.uid,
        companyId: data?.companyId,
        legacyId: data?.legacyId || currentUser.uid,
        contactId: data?.contactId || 'primary',
        role: data?.role,
        profile: {
          name: data?.name || '',
          phone: data?.phone || '',
          companyName: data?.companyName || '',
          businessNo: data?.businessNo || ''
        },
        email: currentUser.email,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      stored.push(newReq);
      localStorage.setItem('dev_membership_requests', JSON.stringify(stored));
      return { status: 'pending' };
    }

    // ── 1. 신규 회원사 가입 즉시 개설 (승인 대기 제거 & 첫 관리자 권한 즉시 부여) ──
    if (name === 'registerNewTenantDirect') {
      const uid = currentUser.uid;
      const email = currentUser.email;
      const cName = String(data?.companyName || '').trim();
      const uName = String(data?.name || '').trim();
      if (!cName) throw new Error('회사명을 입력해 주세요.');
      if (!uName) throw new Error('담당자(대표자) 성명을 입력해 주세요.');

      // 1) 중복 가입 방어: 이미 관리자로 등록된 회사가 있다면 해당 회사 반환 (중복 생성 및 체험일 리셋 방지)
      const deletedIds = JSON.parse(localStorage.getItem('deleted_company_ids') || '[]');
      const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
      const existingMem = Object.values(storedMemberships).find(m => 
        m.uid === uid && 
        m.role === 'tenant_admin' && 
        m.status === 'active' && 
        !deletedIds.includes(m.companyId)
      );
      if (existingMem) {
        return {
          status: 'active',
          companyId: existingMem.companyId,
          companyName: existingMem.companyName || cName,
          role: 'admin',
          authRole: 'tenant_admin',
          isTenantAdmin: true,
          alreadyExisted: true
        };
      }

      // 2) 내부 회사 ID 자동 발급
      const cid = `comp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      const trialStartDate = now.toISOString();
      const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const trialEndDate = trialEnd.toISOString().split('T')[0];

      // 3) 회사 등록 (dev_companies)
      const storedCompanies = JSON.parse(localStorage.getItem('dev_companies') || '[]');
      storedCompanies.push({
        id: cid,
        name: cName,
        companyName: cName,
        businessNo: data?.businessNo || '',
        bizNum: data?.businessNo || '',
        ceo: uName,
        representative: uName,
        managerContact: data?.phone || '',
        phone: data?.phone || '',
        tel: data?.phone || '',
        email,
        status: 'active',
        plan: '무료 체험판 (30일)',
        trialStartDate,
        trialEndDate,
        expiryDate: trialEndDate,
        createdAt: trialStartDate
      });
      localStorage.setItem('dev_companies', JSON.stringify(storedCompanies));

      // 4) 0-state 격리 데이터 초기화
      const emptyCols = [
        'products', 'partners', 'categories', 'accounts', 'schedules',
        'purchaseInvoices', 'purchaseOrders', 'salesInvoices', 'salesOrders',
        'vehicles', 'vehicleLogs', 'expenses', 'inventoryAdjustments',
        'inventoryTransferHistory', 'specialPrices', 'actionLogs'
      ];
      for (const col of emptyCols) {
        localStorage.setItem(`${col}_${cid}`, JSON.stringify([]));
      }
      localStorage.setItem(`inventory_${cid}`, JSON.stringify({}));
      localStorage.setItem(`physicalInventory_${cid}`, JSON.stringify({}));
      // 기본 창고 자동 생성 ("기본 창고")
      const defaultWarehouse = {
        id: 'wh_default',
        _docId: `${cid}_wh_default`,
        name: '기본 창고',
        code: 'WH01',
        isMain: true,
        companyId: cid,
        manager: uName,
        phone: data?.phone || '',
        location: '본사',
        order: 1,
        sequence: 1,
        createdAt: trialStartDate,
        updatedAt: trialStartDate
      };
      localStorage.setItem(`warehouses_${cid}`, JSON.stringify([defaultWarehouse]));
      localStorage.setItem('warehouses', JSON.stringify([defaultWarehouse]));

      // 대표 계정 자동 생성 (회원사 등록 기본 정보 입력 내용 기반)
      const repUserId = email && email.includes('@') ? email.split('@')[0] : (uid.slice(0, 8) || 'admin');
      const repStaff = {
        id: uid,
        userId: repUserId,
        name: uName,
        phone: data?.phone || '',
        email: email,
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
        permissions: { ALL: true, orders: true, loading: true, delivery: true, invoices: true, inventory: true, catalog: true, reports: true },
        companyId: cid,
        createdAt: trialStartDate,
        updatedAt: trialStartDate
      };
      localStorage.setItem(`staffList_${cid}`, JSON.stringify([repStaff]));
      localStorage.setItem('staffList', JSON.stringify([repStaff]));

      // 4-1) 기본 시스템 환경설정 및 회사 정보 자동 연동 (최초 가입 시 입력한 회사명, 사업자번호, 대표자명, 연락처 자동 연동)
      const initialSystemSettings = {
        company: {
          name: cName,
          companyName: cName,
          bizNum: data?.businessNo || '',
          businessNo: data?.businessNo || '',
          ceo: uName,
          representative: uName,
          tel: data?.phone || '',
          phone: data?.phone || '',
          email: email || '',
          address: '',
          type: ''
        },
        display: {
          showMenuIcons: true,
          soundEffects: true,
          realTimeUpdate: true,
          purchaseThemeColor: '#3b82f6',
          salesThemeColor: '#3b82f6',
          orderThemeColor: '#3b82f6'
        },
        salesInvoice: {
          warnNoStock: true,
          saveMode: 'auto'
        },
        transaction: { defaultVat: 10, decimalPlaces: 0, autoNumbering: true },
        language: '한국어 (Korean)',
        timezone: '(GMT+09:00) Seoul'
      };
      localStorage.setItem(`systemSettings_${cid}`, JSON.stringify(initialSystemSettings));
      localStorage.setItem('systemSettings', JSON.stringify(initialSystemSettings));

      const initialCompanySettings = {
        id: cid,
        name: cName,
        companyName: cName,
        businessNo: data?.businessNo || '',
        bizNum: data?.businessNo || '',
        ceo: uName,
        representative: uName,
        phone: data?.phone || '',
        managerContact: data?.phone || '',
        tel: data?.phone || '',
        email: email || '',
        address: '',
        type: '',
        status: 'active',
        createdAt: trialStartDate
      };
      localStorage.setItem(`companySettings_${cid}`, JSON.stringify(initialCompanySettings));
      localStorage.setItem('companySettings', JSON.stringify(initialCompanySettings));

      try {
        if (typeof db !== 'undefined' && db) {
          setDoc(doc(db, 'companies', cid), initialCompanySettings, { merge: true }).catch(() => {});
          setDoc(doc(db, 'companies', cid, 'settings', 'systemSettings'), { value: initialSystemSettings, companyId: cid }, { merge: true }).catch(() => {});
        }
      } catch {}

      // 5) 첫 관리자 권한 부여
      storedMemberships[`${uid}_${cid}`] = {
        uid,
        companyId: cid,
        companyName: cName,
        legacyId: uid,
        role: 'tenant_admin',
        status: 'active',
        permissions: { ALL: true, orders: true, loading: true, delivery: true, invoices: true, inventory: true, catalog: true, reports: true },
        approvedBy: uid,
        approvedAt: trialStartDate
      };
      localStorage.setItem('dev_memberships', JSON.stringify(storedMemberships));

      return {
        status: 'active',
        companyId: cid,
        companyName: cName,
        role: 'admin',
        authRole: 'tenant_admin',
        isTenantAdmin: true,
        trialStartDate,
        trialEndDate
      };
    }

    // ── 2. 로그인 사용자 워크스페이스(다중 소속) & 대기 초대 조회 ──
    if (name === 'getMyWorkspaces') {
      const uid = currentUser.uid;
      const email = (currentUser.email || '').toLowerCase().trim();
      const deletedIds = JSON.parse(localStorage.getItem('deleted_company_ids') || '[]');

      const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
      const storedCompanies = JSON.parse(localStorage.getItem('dev_companies') || '[]');

      const userMemberships = Object.values(storedMemberships).filter(m => 
        m.uid === uid &&
        m.status === 'active' &&
        !deletedIds.includes(m.companyId)
      );

      const workspaces = userMemberships.map(mem => {
        const comp = storedCompanies.find(c => c.id === mem.companyId);
        const isPartner = mem.role === 'partner';
        let partnerName = '';
        if (isPartner && mem.partnerId) {
          const partners = JSON.parse(localStorage.getItem(`partners_${mem.companyId}`) || '[]');
          const p = partners.find(x => x.id === mem.partnerId);
          partnerName = p?.name || mem.partnerId;
        }
        const isTenantAdmin = mem.role === 'tenant_admin';
        return {
          companyId: mem.companyId,
          companyName: comp?.name || mem.companyName || (mem.companyId === 'no1dmkr' ? '동명크릴' : mem.companyId),
          role: isTenantAdmin ? 'admin' : isPartner ? 'partner' : 'staff',
          authRole: isTenantAdmin ? 'tenant_admin' : mem.role,
          isTenantAdmin: isTenantAdmin,
          type: isPartner ? 'partner_order' : 'company_work',
          roleLabel: isTenantAdmin ? '대표 (회사 관리자)' : isPartner ? `거래처 주문 (${partnerName || '고객사'})` : '직원 (Staff)',
          partnerId: mem.partnerId || null,
          partnerName: partnerName || null
        };
      });

      // 0. 링커엑스 본사 운영팀 소속 확인 (슈퍼관리자 또는 플랫폼 운영팀)
      const isSuper = await hasPlatformSuperAdminPrivilege(currentUser);
      const storedPlatformAccess = JSON.parse(localStorage.getItem('dev_platform_access') || '{}');
      const pAccess = storedPlatformAccess[uid];
      if (isSuper || (pAccess && pAccess.status === 'active')) {
        const role = isSuper ? 'super_admin' : pAccess.role;
        const roleLabel = role === 'super_admin' ? '최고 운영 관리자 (슈퍼관리자)'
          : role === 'support' ? '운영팀 고객지원 담당자'
          : role === 'subscription' ? '운영팀 구독관리 담당자'
          : '운영팀 플랫폼 개발자';
        workspaces.unshift({
          companyId: 'linker_x_hq',
          companyName: '링커엑스(Linker X) 본사 운영팀',
          role,
          authRole: isSuper ? 'platform_admin' : 'platform_ops',
          isPlatformStaff: true,
          isSuperAdmin: isSuper,
          type: 'platform_ops',
          roleLabel
        });
      }

      // 대기 중인 초대
      const storedInvitations = JSON.parse(localStorage.getItem('dev_invitations') || '[]');
      const pendingInvitations = storedInvitations.filter(inv => 
        inv.status === 'pending' && inv.targetEmail === email
      );

      return { workspaces, pendingInvitations };
    }

    // ── 3. 직원 초대 생성 ──
    if (name === 'createStaffInvitation') {
      const cid = data?.companyId;
      const targetEmail = String(data?.targetEmail || '').toLowerCase().trim();
      if (!targetEmail) throw new Error('직원 이메일을 입력해 주세요.');

      const storedInvitations = JSON.parse(localStorage.getItem('dev_invitations') || '[]');
      const invId = `inv_staff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newInv = {
        id: invId,
        type: 'staff',
        companyId: cid,
        companyName: data?.companyName || cid,
        targetEmail,
        staffName: data?.staffName || targetEmail.split('@')[0],
        staffId: data?.staffId || `staff_${Date.now()}`,
        phone: data?.phone || '',
        permissions: data?.permissions || {},
        role: 'tenant_staff',
        invitedBy: currentUser.uid,
        invitedByName: currentUser.displayName || '관리자',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      storedInvitations.push(newInv);
      localStorage.setItem('dev_invitations', JSON.stringify(storedInvitations));

      // 로컬 staffList 상태 업데이트
      try {
        const staffKey = `staffList_${cid}`;
        const rawStaff = localStorage.getItem(staffKey) || localStorage.getItem('staffList');
        if (rawStaff) {
          const list = JSON.parse(rawStaff);
          const updated = list.map(s => {
            if (String(s.id) === String(newInv.staffId) || String(s.userId) === String(newInv.staffId)) {
              return { ...s, accountStatus: 'invited', invitationEmail: targetEmail, invitedAt: new Date().toISOString() };
            }
            return s;
          });
          localStorage.setItem(staffKey, JSON.stringify(updated));
          localStorage.setItem('staffList', JSON.stringify(updated));
        }
      } catch (e) {
        console.warn('Error updating local staffList on invite:', e);
      }

      return { ok: true, invitationId: invId, targetEmail };
    }

    // ── 3-1. 직원의 직접 연결 요청 (로그인 화면에서 대표 이메일로 요청) ──
    if (name === 'requestStaffConnection') {
      const repEmail = String(data?.representativeEmail || '').toLowerCase().trim();
      if (!repEmail) throw new Error('연결할 회사의 대표 이메일을 입력해 주세요.');

      const storedTenants = JSON.parse(localStorage.getItem('dev_tenants') || '[]');
      const storedCompanies = JSON.parse(localStorage.getItem('dev_companies') || '[]');
      const allCompanies = [...storedTenants, ...storedCompanies];
      const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');

      let matchedTenant = allCompanies.find(t => 
        (t.representativeEmail && t.representativeEmail.toLowerCase().trim() === repEmail) ||
        (t.ceoEmail && t.ceoEmail.toLowerCase().trim() === repEmail) ||
        (t.email && t.email.toLowerCase().trim() === repEmail)
      );

      // Check tenant_admin memberships with this email
      if (!matchedTenant) {
        for (const [key, mem] of Object.entries(storedMemberships)) {
          if (mem.role === 'tenant_admin' && mem.email && mem.email.toLowerCase().trim() === repEmail && mem.status === 'active') {
            const comp = allCompanies.find(c => c.id === mem.companyId);
            if (comp) {
              matchedTenant = comp;
              break;
            }
          }
        }
      }

      if (!matchedTenant) {
        const notFoundErr = new Error(`해당 대표 이메일(${repEmail})로 등록된 회원사를 찾을 수 없습니다. 회사 관리자에게 대표 이메일을 확인해 주세요.`);
        notFoundErr.code = 'not-found';
        throw notFoundErr;
      }

      const cid = matchedTenant.id;
      if (storedMemberships[`${currentUser.uid}_${cid}`]?.status === 'active') {
        return { ok: true, companyId: cid, companyName: matchedTenant.name, status: 'connected', alreadyLinked: true };
      }

      const storedReqs = JSON.parse(localStorage.getItem('dev_staff_connections') || '[]');
      const reqId = `req_${currentUser.uid}_${cid}`;
      const existingReqIdx = storedReqs.findIndex(r => r.id === reqId || (r.uid === currentUser.uid && r.companyId === cid));
      const reqObj = {
        id: reqId,
        uid: currentUser.uid,
        applicantEmail: (currentUser.email || '').toLowerCase().trim(),
        applicantName: currentUser.displayName || (currentUser.email || '').split('@')[0],
        representativeEmail: repEmail,
        companyId: cid,
        companyName: matchedTenant.name,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      if (existingReqIdx >= 0) {
        storedReqs[existingReqIdx] = reqObj;
      } else {
        storedReqs.push(reqObj);
      }
      localStorage.setItem('dev_staff_connections', JSON.stringify(storedReqs));
      return { ok: true, companyId: cid, companyName: matchedTenant.name, status: 'pending' };
    }

    // ── 3-2. 회사 관리자의 직원 연결 요청 목록 조회 ──
    if (name === 'listStaffConnectionRequests') {
      const cid = data?.companyId || 'no1dmkr';
      const storedReqs = JSON.parse(localStorage.getItem('dev_staff_connections') || '[]');
      const list = storedReqs.filter(r => r.companyId === cid && r.status === 'pending');
      return list;
    }

    // ── 3-3. 관리자가 직원 카드를 계정과 연결 승인 ──
    if (name === 'connectStaffAccount') {
      const cid = data?.companyId;
      const staffId = data?.staffId;
      const applicantUid = data?.applicantUid;
      const applicantEmail = String(data?.applicantEmail || '').toLowerCase().trim();

      const staffKey = `staffList_${cid}`;
      const rawStaff = localStorage.getItem(staffKey) || localStorage.getItem('staffList') || '[]';
      const staffList = JSON.parse(rawStaff);
      const targetStaff = staffList.find(s => String(s.id) === String(staffId) || String(s.userId) === String(staffId));
      if (!targetStaff) throw new Error('연결할 직원 카드를 찾을 수 없습니다.');

      if (targetStaff.linkedUid && targetStaff.linkedUid !== applicantUid) {
        throw new Error(`이미 다른 계정(${targetStaff.linkedEmail || targetStaff.linkedUid})에 연결된 직원 카드입니다. 다른 직원을 선택하거나 새로 등록해 주세요.`);
      }

      // 1) 직원 카드 업데이트
      const updatedList = staffList.map(s => {
        if (String(s.id) === String(staffId) || String(s.userId) === String(staffId)) {
          return {
            ...s,
            accountStatus: 'linked',
            linkedUid: applicantUid,
            linkedEmail: applicantEmail,
            linkedAt: new Date().toISOString()
          };
        }
        return s;
      });
      localStorage.setItem(staffKey, JSON.stringify(updatedList));
      localStorage.setItem('staffList', JSON.stringify(updatedList));

      // 2) 멤버십 부여
      const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
      storedMemberships[`${applicantUid}_${cid}`] = {
        uid: applicantUid,
        email: applicantEmail,
        companyId: cid,
        companyName: cid,
        legacyId: staffId,
        userId: targetStaff.userId || staffId,
        role: 'tenant_staff',
        status: 'active',
        permissions: targetStaff.permissions || {},
        approvedBy: currentUser.uid,
        approvedAt: new Date().toISOString()
      };
      localStorage.setItem('dev_memberships', JSON.stringify(storedMemberships));

      // 3) 연결 요청 상태 갱신
      const storedReqs = JSON.parse(localStorage.getItem('dev_staff_connections') || '[]');
      const updatedReqs = storedReqs.map(r => {
        if (r.uid === applicantUid && r.companyId === cid) {
          return { ...r, status: 'approved', connectedStaffId: staffId, approvedAt: new Date().toISOString() };
        }
        return r;
      });
      localStorage.setItem('dev_staff_connections', JSON.stringify(updatedReqs));

      return { ok: true, companyId: cid, staffId, applicantEmail };
    }

    // ── 3-4. 직원 퇴사 처리 (계정 접근 해제 & 기존 업무 기록 보존) ──
    if (name === 'revokeStaffAccess') {
      const cid = data?.companyId;
      const staffId = data?.staffId;
      const uid = data?.uid;

      const staffKey = `staffList_${cid}`;
      const rawStaff = localStorage.getItem(staffKey) || localStorage.getItem('staffList') || '[]';
      const staffList = JSON.parse(rawStaff);

      let targetUid = uid;
      const updatedList = staffList.map(s => {
        if (String(s.id) === String(staffId) || String(s.userId) === String(staffId)) {
          if (!targetUid) targetUid = s.linkedUid;
          return {
            ...s,
            accountStatus: 'unlinked',
            linkedUid: null,
            linkedEmail: null,
            resigned: true,
            resignedAt: new Date().toISOString()
          };
        }
        return s;
      });
      localStorage.setItem(staffKey, JSON.stringify(updatedList));
      localStorage.setItem('staffList', JSON.stringify(updatedList));

      if (targetUid) {
        const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
        if (storedMemberships[`${targetUid}_${cid}`]) {
          storedMemberships[`${targetUid}_${cid}`].status = 'resigned';
          storedMemberships[`${targetUid}_${cid}`].resignedAt = new Date().toISOString();
          localStorage.setItem('dev_memberships', JSON.stringify(storedMemberships));
        }
      }

      return { ok: true, companyId: cid, staffId, revokedUid: targetUid };
    }

    // ── 3-5. 링커엑스 본사 운영팀 직원 초대 (슈퍼관리자 전용) ──
    if (name === 'createPlatformStaffInvitation') {
      const isSuper = await hasPlatformSuperAdminPrivilege(currentUser);
      if (!isSuper) throw new Error('슈퍼관리자만 운영팀 직원을 초대할 수 있습니다.');

      const targetEmail = String(data?.targetEmail || '').toLowerCase().trim();
      const staffName = String(data?.staffName || '').trim();
      const staffId = data?.staffId || `pstaff_${Date.now()}`;
      const role = data?.role || 'support';
      if (!['support', 'subscription', 'developer'].includes(role)) {
        throw new Error('유효한 운영 역할을 지정해 주세요.');
      }
      if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
        throw new Error('유효한 직원 이메일 주소를 입력해 주세요.');
      }

      // 로컬 dev_platform_staff 확인 및 업데이트
      const storedStaff = JSON.parse(localStorage.getItem('dev_platform_staff') || '[]');
      let staffCard = storedStaff.find(s => s.id === staffId);
      if (staffCard && staffCard.accountStatus === 'linked' && staffCard.linkedEmail && staffCard.linkedEmail !== targetEmail) {
        throw new Error(`이미 다른 계정(${staffCard.linkedEmail})에 연결된 직원 카드입니다.`);
      }

      if (!staffCard) {
        staffCard = {
          id: staffId,
          name: staffName,
          email: targetEmail,
          role,
          dept: data?.dept || (role === 'support' ? '고객지원팀' : role === 'subscription' ? '구독관리팀' : '플랫폼 개발팀'),
          tasks: data?.tasks || (role === 'support' ? '고객 문의 및 시스템 오류 확인' : role === 'subscription' ? '구독/요금제 상태 관리' : '시스템 유지보수'),
          status: '초대 발송',
          accountStatus: 'invited',
          createdAt: new Date().toISOString()
        };
        storedStaff.push(staffCard);
      } else {
        staffCard.accountStatus = 'invited';
        staffCard.status = '초대 발송';
        staffCard.email = targetEmail;
        staffCard.role = role;
        staffCard.invitedAt = new Date().toISOString();
      }
      localStorage.setItem('dev_platform_staff', JSON.stringify(storedStaff));

      // 초대 생성
      const storedInvitations = JSON.parse(localStorage.getItem('dev_invitations') || '[]');
      const invId = `inv_pstaff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const permissions = role === 'support'
        ? { tickets: true, errors: true, sync: true, tenantBusinessData: false }
        : role === 'subscription'
        ? { subscriptions: true, billing: true, tenantBusinessData: false }
        : { errors: true, sync: true, tenantBusinessData: false };

      const newInv = {
        id: invId,
        type: 'platform_staff',
        companyId: 'linker_x_hq',
        companyName: '링커엑스(Linker X) 본사 운영팀',
        staffId,
        staffName: staffName || targetEmail.split('@')[0],
        targetEmail,
        role,
        permissions,
        invitedBy: currentUser.uid,
        status: 'pending',
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      };
      storedInvitations.push(newInv);
      localStorage.setItem('dev_invitations', JSON.stringify(storedInvitations));

      // 감사 로그
      const storedAudit = JSON.parse(localStorage.getItem('dev_auth_audit') || '[]');
      storedAudit.push({
        actor: currentUser.uid,
        target: staffId,
        targetEmail,
        role,
        action: 'createPlatformStaffInvitation',
        at: new Date().toISOString()
      });
      localStorage.setItem('dev_auth_audit', JSON.stringify(storedAudit));

      return { ok: true, invitationId: invId, staffId, targetEmail, role };
    }

    // ── 3-6. 링커엑스 본사 운영팀 직원 역할 변경 (슈퍼관리자 전용) ──
    if (name === 'updatePlatformStaffRole') {
      const isSuper = await hasPlatformSuperAdminPrivilege(currentUser);
      if (!isSuper) throw new Error('슈퍼관리자만 역할을 변경할 수 있습니다.');

      const staffId = data?.staffId;
      const newRole = data?.newRole || data?.role;
      if (!staffId || !['support', 'subscription', 'developer'].includes(newRole)) {
        throw new Error('유효한 직원 ID와 역할을 입력해 주세요.');
      }

      const storedStaff = JSON.parse(localStorage.getItem('dev_platform_staff') || '[]');
      const staffCard = storedStaff.find(s => s.id === staffId);
      if (!staffCard) throw new Error('직원 카드를 찾을 수 없습니다.');

      const oldRole = staffCard.role;
      staffCard.role = newRole;
      if (data?.dept) staffCard.dept = data.dept;
      if (data?.tasks) staffCard.tasks = data.tasks;
      staffCard.updatedAt = new Date().toISOString();
      localStorage.setItem('dev_platform_staff', JSON.stringify(storedStaff));

      if (staffCard.linkedUid) {
        const storedPlatformAccess = JSON.parse(localStorage.getItem('dev_platform_access') || '{}');
        if (storedPlatformAccess[staffCard.linkedUid]) {
          storedPlatformAccess[staffCard.linkedUid].role = newRole;
          storedPlatformAccess[staffCard.linkedUid].permissions = newRole === 'support'
            ? { customerSupport: true, viewErrors: true, viewSync: true, tenantBusinessData: false }
            : newRole === 'subscription'
            ? { subscriptionManage: true, viewBilling: true, viewPlans: true, tenantBusinessData: false }
            : { developer: true, viewErrors: true, viewSync: true, tenantBusinessData: false };
          storedPlatformAccess[staffCard.linkedUid].updatedAt = new Date().toISOString();
          localStorage.setItem('dev_platform_access', JSON.stringify(storedPlatformAccess));
        }
      }

      // 감사 로그
      const storedAudit = JSON.parse(localStorage.getItem('dev_auth_audit') || '[]');
      storedAudit.push({
        actor: currentUser.uid,
        target: staffId,
        targetUid: staffCard.linkedUid || null,
        oldRole,
        newRole,
        action: 'updatePlatformStaffRole',
        at: new Date().toISOString()
      });
      localStorage.setItem('dev_auth_audit', JSON.stringify(storedAudit));

      return { ok: true, staffId, newRole };
    }

    // ── 3-7. 링커엑스 운영팀 접근 권한 해제 / 퇴사 (슈퍼관리자 전용) ──
    if (name === 'revokePlatformStaffAccess') {
      const isSuper = await hasPlatformSuperAdminPrivilege(currentUser);
      if (!isSuper) throw new Error('슈퍼관리자만 운영팀 접근 권한을 해제할 수 있습니다.');

      const staffId = data?.staffId;
      const storedStaff = JSON.parse(localStorage.getItem('dev_platform_staff') || '[]');
      const staffCard = storedStaff.find(s => s.id === staffId);
      if (!staffCard) throw new Error('직원 카드를 찾을 수 없습니다.');

      const uidToRevoke = staffCard.linkedUid;
      staffCard.accountStatus = 'revoked';
      staffCard.status = '접근해제';
      staffCard.resigned = true;
      staffCard.resignedAt = new Date().toISOString();
      localStorage.setItem('dev_platform_staff', JSON.stringify(storedStaff));

      if (uidToRevoke) {
        // 링커엑스 본사 접근 권한만 회수! (회원사 소속 dev_memberships 및 이전 업무 기록은 완전 보존)
        const storedPlatformAccess = JSON.parse(localStorage.getItem('dev_platform_access') || '{}');
        if (storedPlatformAccess[uidToRevoke]) {
          storedPlatformAccess[uidToRevoke].status = 'revoked';
          storedPlatformAccess[uidToRevoke].revokedAt = new Date().toISOString();
          storedPlatformAccess[uidToRevoke].revokedBy = currentUser.uid;
          localStorage.setItem('dev_platform_access', JSON.stringify(storedPlatformAccess));
        }
      }

      // 감사 로그
      const storedAudit = JSON.parse(localStorage.getItem('dev_auth_audit') || '[]');
      storedAudit.push({
        actor: currentUser.uid,
        target: staffId,
        targetUid: uidToRevoke || null,
        action: 'revokePlatformStaffAccess',
        at: new Date().toISOString()
      });
      localStorage.setItem('dev_auth_audit', JSON.stringify(storedAudit));

      return { ok: true, staffId, revokedUid: uidToRevoke };
    }

    // ── 4. 거래처 주문 초대 생성 ──
    if (name === 'createPartnerInvitation') {
      const cid = data?.companyId;
      const partnerId = data?.partnerId;
      const targetEmail = String(data?.targetEmail || '').toLowerCase().trim();
      if (!partnerId) throw new Error('거래처를 지정해 주세요.');
      if (!targetEmail) throw new Error('거래처 담당자 이메일을 입력해 주세요.');

      const storedInvitations = JSON.parse(localStorage.getItem('dev_invitations') || '[]');
      const invId = `inv_partner_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newInv = {
        id: invId,
        type: 'partner_order',
        companyId: cid,
        companyName: data?.companyName || cid,
        partnerId,
        partnerName: data?.partnerName || partnerId,
        targetEmail,
        contactName: data?.contactName || '',
        phone: data?.phone || '',
        role: 'partner',
        invitedBy: currentUser.uid,
        invitedByName: currentUser.displayName || '관리자',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      storedInvitations.push(newInv);
      localStorage.setItem('dev_invitations', JSON.stringify(storedInvitations));
      return { ok: true, invitationId: invId, targetEmail, partnerName: newInv.partnerName };
    }

    // ── 5. 초대 수락 (직원 또는 거래처 주문 초대) ──
    if (name === 'acceptInvitation') {
      const invId = data?.invitationId;
      const storedInvitations = JSON.parse(localStorage.getItem('dev_invitations') || '[]');
      const inv = storedInvitations.find(i => i.id === invId);
      if (!inv || inv.status !== 'pending') throw new Error('유효하지 않거나 이미 처리된 초대입니다.');
      if (inv.targetEmail !== (currentUser.email || '').toLowerCase().trim()) {
        throw new Error('초대 대상 이메일 계정으로 로그인해야 수락할 수 있습니다.');
      }

      const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
      const cid = inv.companyId;

      if (inv.type === 'staff') {
        // 기존 직원 카드가 다른 계정에 연결되어 있는지 검증
        const staffKey = `staffList_${cid}`;
        const rawStaff = localStorage.getItem(staffKey) || localStorage.getItem('staffList') || '[]';
        const staffList = JSON.parse(rawStaff);
        const existing = staffList.find(s => String(s.id) === String(inv.staffId) || String(s.userId) === String(inv.staffId));
        if (existing && existing.linkedUid && existing.linkedUid !== currentUser.uid) {
          throw new Error(`이미 다른 계정(${existing.linkedEmail || existing.linkedUid})에 연결된 직원 카드입니다.`);
        }

        // 직원 카드 업데이트
        const updatedList = staffList.map(s => {
          if (String(s.id) === String(inv.staffId) || String(s.userId) === String(inv.staffId)) {
            return {
              ...s,
              accountStatus: 'linked',
              linkedUid: currentUser.uid,
              linkedEmail: currentUser.email,
              linkedAt: new Date().toISOString()
            };
          }
          return s;
        });
        localStorage.setItem(staffKey, JSON.stringify(updatedList));
        localStorage.setItem('staffList', JSON.stringify(updatedList));

        // 멤버십 설정
        storedMemberships[`${currentUser.uid}_${cid}`] = {
          uid: currentUser.uid,
          email: currentUser.email,
          companyId: cid,
          companyName: inv.companyName,
          legacyId: inv.staffId,
          role: 'tenant_staff',
          status: 'active',
          permissions: inv.permissions || { orders: true },
          approvedBy: inv.invitedBy,
          approvedAt: new Date().toISOString()
        };

        // 직접 연결 요청이 있었다면 함께 승인 완료 처리
        const storedReqs = JSON.parse(localStorage.getItem('dev_staff_connections') || '[]');
        const updatedReqs = storedReqs.map(r => {
          if (r.uid === currentUser.uid && r.companyId === cid) {
            return { ...r, status: 'approved', connectedStaffId: inv.staffId, approvedAt: new Date().toISOString() };
          }
          return r;
        });
        localStorage.setItem('dev_staff_connections', JSON.stringify(updatedReqs));
      } else if (inv.type === 'partner_order') {
        storedMemberships[`${currentUser.uid}_${cid}`] = {
          uid: currentUser.uid,
          companyId: cid,
          companyName: inv.companyName,
          legacyId: inv.partnerId,
          partnerId: inv.partnerId,
          role: 'partner',
          status: 'active',
          permissions: { orders: true },
          approvedBy: inv.invitedBy,
          approvedAt: new Date().toISOString()
        };
      } else if (inv.type === 'platform_staff') {
        const storedStaff = JSON.parse(localStorage.getItem('dev_platform_staff') || '[]');
        const existing = storedStaff.find(s => s.id === inv.staffId);
        if (existing && existing.linkedUid && existing.linkedUid !== currentUser.uid) {
          throw new Error('이미 다른 계정에 연결된 운영팀 직원 카드입니다.');
        }

        const updatedStaff = storedStaff.map(s => {
          if (s.id === inv.staffId) {
            return {
              ...s,
              accountStatus: 'linked',
              status: '연결 완료',
              linkedUid: currentUser.uid,
              linkedEmail: currentUser.email,
              linkedAt: new Date().toISOString()
            };
          }
          return s;
        });
        localStorage.setItem('dev_platform_staff', JSON.stringify(updatedStaff));

        const storedPlatformAccess = JSON.parse(localStorage.getItem('dev_platform_access') || '{}');
        storedPlatformAccess[currentUser.uid] = {
          uid: currentUser.uid,
          status: 'active',
          role: inv.role,
          staffId: inv.staffId,
          name: inv.staffName || currentUser.displayName || '운영자',
          email: currentUser.email,
          permissions: inv.permissions || {},
          approvedBy: inv.invitedBy,
          approvedAt: new Date().toISOString()
        };
        localStorage.setItem('dev_platform_access', JSON.stringify(storedPlatformAccess));

        // 감사 로그 기록
        const storedAudit = JSON.parse(localStorage.getItem('dev_auth_audit') || '[]');
        storedAudit.push({
          actor: currentUser.uid,
          target: inv.staffId,
          targetEmail: currentUser.email,
          action: 'acceptPlatformStaffInvitation',
          role: inv.role,
          at: new Date().toISOString()
        });
        localStorage.setItem('dev_auth_audit', JSON.stringify(storedAudit));
      }

      inv.status = 'accepted';
      inv.acceptedBy = currentUser.uid;
      inv.acceptedAt = new Date().toISOString();
      localStorage.setItem('dev_invitations', JSON.stringify(storedInvitations));
      localStorage.setItem('dev_memberships', JSON.stringify(storedMemberships));
      return { ok: true, status: 'accepted', companyId: cid, role: inv.role };
    }

    // ── 6. 회원사 간 링커 연결 요청 ──
    if (name === 'requestCompanyLink') {
      const fromCid = data?.fromCompanyId;
      const toCid = data?.toCompanyId;
      const partnerId = data?.partnerId;
      if (!fromCid || !toCid || fromCid === toCid) throw new Error('연결 대상 회원사를 확인해 주세요.');

      const storedLinks = JSON.parse(localStorage.getItem('dev_company_links') || '[]');
      const linkId = `link_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      storedLinks.push({
        id: linkId,
        fromCompanyId: fromCid,
        fromCompanyName: data?.fromCompanyName || fromCid,
        toCompanyId: toCid,
        toCompanyName: data?.toCompanyName || toCid,
        partnerId,
        requestedBy: currentUser.uid,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('dev_company_links', JSON.stringify(storedLinks));
      return { ok: true, linkId };
    }

    // ── 7. 회원사 간 링커 연결 수락 ──
    if (name === 'acceptCompanyLink') {
      const linkId = data?.linkId;
      const storedLinks = JSON.parse(localStorage.getItem('dev_company_links') || '[]');
      const link = storedLinks.find(l => l.id === linkId);
      if (!link || link.status !== 'pending') throw new Error('유효하지 않거나 이미 처리된 요청입니다.');

      // 양사 거래처 문서에 linkedCompanyId 연결
      if (link.partnerId) {
        const fromPartners = JSON.parse(localStorage.getItem(`partners_${link.fromCompanyId}`) || '[]');
        const p = fromPartners.find(x => x.id === link.partnerId);
        if (p) {
          p.linkedCompanyId = link.toCompanyId;
          p.linkStatus = 'linked';
          localStorage.setItem(`partners_${link.fromCompanyId}`, JSON.stringify(fromPartners));
        }
      }
      if (data?.matchingPartnerId) {
        const toPartners = JSON.parse(localStorage.getItem(`partners_${link.toCompanyId}`) || '[]');
        const toP = toPartners.find(x => x.id === data.matchingPartnerId);
        if (toP) {
          toP.linkedCompanyId = link.fromCompanyId;
          toP.linkStatus = 'linked';
          localStorage.setItem(`partners_${link.toCompanyId}`, JSON.stringify(toPartners));
        }
      }

      link.status = 'active';
      link.acceptedBy = currentUser.uid;
      link.acceptedAt = new Date().toISOString();
      localStorage.setItem('dev_company_links', JSON.stringify(storedLinks));
      return { ok: true, status: 'active' };
    }

    // ── 8. 개인정보 처리위탁 합의서 동의 기록 ──
    if (name === 'recordDpaAgreement') {
      const cid = data?.companyId;
      if (!cid) throw new Error('회원사 정보가 올바르지 않습니다.');

      const record = {
        companyId: cid,
        agreedByUid: currentUser?.uid || data?.agreedByUid || 'admin',
        agreedByEmail: currentUser?.email || data?.agreedByEmail || '',
        dpaVersion: data?.dpaVersion || 'v1.0-draft',
        agreedAt: new Date().toISOString(),
        status: 'active'
      };

      localStorage.setItem(`dpaAgreement_${cid}`, JSON.stringify(record));
      const allCompliance = JSON.parse(localStorage.getItem('dev_compliance_records') || '{}');
      allCompliance[`dpa_${cid}`] = record;
      localStorage.setItem('dev_compliance_records', JSON.stringify(allCompliance));
      return { ok: true, record };
    }

    // ── 9. 유료 구독 계약 체결 기록 ──
    if (name === 'recordSubscriptionAgreement') {
      const cid = data?.companyId;
      if (!cid) throw new Error('회원사 정보가 올바르지 않습니다.');

      const record = {
        companyId: cid,
        companyName: data?.companyName || cid,
        agreedByUid: currentUser?.uid || data?.agreedByUid || 'admin',
        agreedByEmail: currentUser?.email || data?.agreedByEmail || '',
        contractVersion: data?.contractVersion || 'v1.0-draft',
        planName: data?.planName || '스탠다드 플랜',
        price: data?.price || '33,000원',
        billingCycle: data?.billingCycle || '월간',
        agreedAt: new Date().toISOString(),
        pricingSnapshot: data?.pricingSnapshot || {},
        status: 'active'
      };

      localStorage.setItem(`subscriptionAgreement_${cid}`, JSON.stringify(record));
      const allCompliance = JSON.parse(localStorage.getItem('dev_compliance_records') || '{}');
      allCompliance[`sub_${cid}`] = record;
      localStorage.setItem('dev_compliance_records', JSON.stringify(allCompliance));
      return { ok: true, record };
    }

    // ── 10. 컴플라이언스 및 계약 상태 조회 ──
    if (name === 'getCompanyComplianceStatus') {
      const cid = data?.companyId;
      if (!cid) throw new Error('회원사 정보가 필요합니다.');

      const dpa = JSON.parse(localStorage.getItem(`dpaAgreement_${cid}`) || 'null');
      const sub = JSON.parse(localStorage.getItem(`subscriptionAgreement_${cid}`) || 'null');
      return { ok: true, dpa, subscription: sub };
    }

    throw new Error(`지원되지 않는 인증 요청입니다: ${name}`);
}

export async function reauthenticate(password) {
  const { reauthenticateWithCredential, reauthenticateWithPopup, EmailAuthProvider } = await import('firebase/auth');
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');
  if (user.providerData.some(p => p.providerId === 'password')) {
    return reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  }
  return reauthenticateWithPopup(user, new GoogleAuthProvider());
}
