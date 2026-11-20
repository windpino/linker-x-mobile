import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendEmailVerification, 
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
  signOut, 
  setPersistence, 
  browserSessionPersistence 
} from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import app, { auth, authTargetMode } from '../firebase.js';

const functions = getFunctions(app, 'asia-northeast3');
if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUTH_PRODUCTION_APPROVED !== 'true') {
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

const ready = () => setPersistence(auth, browserSessionPersistence);

export async function register(email, password) {
  await ready();
  auth.languageCode = 'ko';
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  let verificationSent = false;
  let verificationError = null;
  try {
    const continueUrl = getContinueUrl();
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

export async function login(email, password) { 
  await ready(); 
  return signInWithEmailAndPassword(auth, email.trim(), password); 
}

export async function googleLogin() { 
  await ready(); 
  return signInWithPopup(auth, new GoogleAuthProvider()); 
}

export async function verifyEmail() {
  if (!auth.currentUser) throw new Error('로그인된 계정이 없습니다.');
  auth.languageCode = 'ko';
  const continueUrl = getContinueUrl();
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
export function initDongmyeongSampleData() {
  const cid = 'no1dmkr';
  try {
    const seedCollection = (key, data) => {
      const serialized = JSON.stringify(data);
      localStorage.setItem(`${key}_${cid}`, serialized);
      localStorage.setItem(`bundle_${key}_${cid}`, serialized);
      localStorage.setItem(`bundle_ver_${key}_${cid}`, '1');
    };

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

export async function callAuth(name, data) { 
  if (authTargetMode === 'production') {
    return (await httpsCallable(functions, name)(data)).data;
  }

  const currentUser = (typeof window !== 'undefined' && window.__mockFirebaseUser) || auth.currentUser;
  if (!currentUser) throw new Error('로그인이 필요합니다.');

  // Local / verification mode authorization handling
    if (name === 'authSession') {
      const cid = data?.companyId;
      if (cid === 'linker_x_hq') {
        const isPlatform = await hasPlatformSuperAdminPrivilege(currentUser);
        if (!isPlatform) {
          const pErr = new Error('플랫폼 관리자 승인이 필요합니다.');
          pErr.code = 'permission-denied';
          throw pErr;
        }
        const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
        return {
          authUid: currentUser.uid,
          id: currentUser.uid,
          userId: currentUser.uid,
          companyId: 'linker_x_hq',
          legacyId: currentUser.uid,
          partnerId: null,
          role: 'super_admin',
          authRole: 'platform_admin',
          isPlatformAdmin: true,
          claims: tokenResult?.claims || {},
          status: 'active',
          name: currentUser.displayName || '슈퍼관리자',
          email: currentUser.email,
          permissions: {
            sales: true,
            purchase: true,
            product: true,
            warehouse: true,
            partner: true,
            account: true,
            schedule: true,
            report: true
          }
        };
      }

      // Normal company check
      const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
      const mem = storedMemberships[`${currentUser.uid}_${cid}`];
      if (mem && mem.status === 'active') {
        if (cid === 'no1dmkr') {
          initDongmyeongSampleData();
        }
        return {
          authUid: currentUser.uid,
          id: currentUser.uid,
          userId: currentUser.uid,
          companyId: cid,
          companyName: mem.companyName || cid,
          legacyId: mem.legacyId,
          role: mem.role === 'tenant_admin' ? 'admin' : mem.role === 'partner' ? 'partner' : 'staff',
          authRole: mem.role,
          status: 'active',
          name: currentUser.displayName || '사용자',
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
        localStorage.setItem(`warehouses_${finalCompanyId}`, JSON.stringify([
          { id: Date.now(), name: '기본창고', isMain: true, companyId: finalCompanyId }
        ]));
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
      // 1. Check local memberships
      const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
      const userMemberships = Object.values(storedMemberships).filter(m => m.uid === uid && m.status === 'active');
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
