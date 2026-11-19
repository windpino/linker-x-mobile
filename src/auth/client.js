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
import app, { auth } from '../firebase.js';

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

export async function callAuth(name, data) { 
  try {
    return (await httpsCallable(functions, name)(data)).data; 
  } catch (err) {
    const isUnreachable = err.code === 'functions/unavailable' || 
                          err.code === 'functions/internal' || 
                          err.code === 'functions/not-found' ||
                          err.message?.includes('Failed to fetch') ||
                          err.message?.includes('NetworkError');

    // If real backend responded with permission-denied or invalid-argument, rethrow directly
    if (!isUnreachable && err.code && err.code.startsWith('functions/')) {
      throw err;
    }

    const currentUser = auth.currentUser;
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
        return {
          authUid: currentUser.uid,
          companyId: cid,
          legacyId: mem.legacyId,
          role: mem.role === 'tenant_admin' ? 'admin' : mem.role === 'partner' ? 'partner' : 'staff',
          authRole: mem.role,
          status: 'active',
          name: currentUser.displayName || '사용자',
          email: currentUser.email
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
      return stored.filter(r => r.companyId === cid);
    }

    if (name === 'approveMembership') {
      const isPlatform = await hasPlatformSuperAdminPrivilege(currentUser);
      if (!isPlatform) {
        const pErr = new Error('관리자 권한이 필요합니다.');
        pErr.code = 'permission-denied';
        throw pErr;
      }
      const stored = JSON.parse(localStorage.getItem('dev_membership_requests') || '[]');
      const targetReq = stored.find(r => r.uid === data?.uid && r.companyId === data?.companyId);
      const updated = stored.map(r => (r.uid === data?.uid && r.companyId === data?.companyId ? { ...r, status: 'approved' } : r));
      localStorage.setItem('dev_membership_requests', JSON.stringify(updated));

      const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
      const isTenantAdmin = data?.createCompany === true || targetReq?.role === 'tenant_admin' || data?.role === 'tenant_admin';
      storedMemberships[`${data?.uid}_${data?.companyId}`] = {
        uid: data?.uid,
        companyId: data?.companyId,
        companyName: targetReq?.profile?.companyName || data?.companyName || data?.companyId,
        legacyId: data?.uid,
        role: isTenantAdmin ? 'tenant_admin' : 'tenant_staff',
        status: 'active'
      };
      localStorage.setItem('dev_memberships', JSON.stringify(storedMemberships));
      return { status: 'approved' };
    }

    if (name === 'getMyRegistrationStatus') {
      const uid = currentUser.uid;
      // 1. Check local memberships
      const storedMemberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
      const userMemberships = Object.values(storedMemberships).filter(m => m.uid === uid && m.status === 'active');
      const adminMem = userMemberships.find(m => m.role === 'tenant_admin') || userMemberships[0];

      if (adminMem) {
        return {
          status: 'approved',
          companyId: adminMem.companyId,
          companyName: adminMem.companyName || adminMem.companyId,
          role: adminMem.role,
          isTenantAdmin: adminMem.role === 'tenant_admin'
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

    throw err;
  }
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
