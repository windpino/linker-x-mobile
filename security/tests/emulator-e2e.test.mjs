import * as handlers from '../../functions/index.js';
import { test, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithCredential, 
  linkWithCredential,
  signOut 
} from 'firebase/auth';
import { initializeApp as adminApp, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') {
  throw new Error('Firebase Auth and Firestore emulators must be running');
}

const project = 'demo-linker-auth';
const app = initializeApp({ projectId: project, apiKey: 'demo-key' }, 'e2e-client-app');
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
auth.languageCode = 'ko';

const admin = adminApp({ projectId: project }, 'e2e-admin-app');
const adb = getFirestore(admin);
const aAuth = adminAuth(admin);

async function call(name, data, token) {
  try {
    const decoded = token ? await aAuth.verifyIdToken(token) : null;
    const result = await handlers[name].run({ 
      data, 
      auth: decoded ? { uid: decoded.uid, token: decoded } : undefined 
    });
    return { status: 200, body: { result } };
  } catch (error) {
    const statusMap = {
      'unauthenticated': 401,
      'permission-denied': 403,
      'invalid-argument': 400,
      'failed-precondition': 400,
      'not-found': 404,
      'already-exists': 409
    };
    return { 
      status: statusMap[error.code] || 500, 
      body: { error: { code: error.code, message: error.message } } 
    };
  }
}

const makeGoogleJwt = (sub, email) => {
  const encode = v => Buffer.from(JSON.stringify(v)).toString('base64url');
  return encode({ alg: 'none', typ: 'JWT' }) + '.' + 
         encode({
           sub,
           email,
           email_verified: true,
           name: 'Google User',
           iat: Math.floor(Date.now() / 1000),
           exp: Math.floor(Date.now() / 1000) + 3600,
           aud: 'demo-client'
         }) + '.';
};

after(async () => {
  await signOut(auth).catch(() => {});
  await deleteApp(app).catch(() => {});
  await deleteAdmin(admin).catch(() => {});
});

describe('Defect 1: SuperAdmin Email/Password & Google Single UID Sharing', () => {
  test('Email/Password account links Google credential and retains identical UID with both providers', async () => {
    const email = `superadmin_${Date.now()}@linker-x.com`;
    const password = 'SuperPassword123!';
    
    // 1. Create initial Email/Password user
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const initialUid = cred.user.uid;
    assert.ok(initialUid, 'Initial UID must exist');
    assert.equal(cred.user.providerData.length, 1);
    assert.equal(cred.user.providerData[0].providerId, 'password');

    // 2. Link Google credential
    const googleJwt = makeGoogleJwt(`google_sub_${Date.now()}`, email);
    const googleCred = GoogleAuthProvider.credential(googleJwt);
    const linkResult = await linkWithCredential(cred.user, googleCred);
    
    // 3. Verify UID is EXACTLY IDENTICAL
    assert.equal(linkResult.user.uid, initialUid, 'UID must remain exactly the same after Google linking');
    
    // 4. Verify providerData contains both password and google.com
    const providers = linkResult.user.providerData.map(p => p.providerId);
    assert.ok(providers.includes('password'), 'Must retain password provider');
    assert.ok(providers.includes('google.com'), 'Must include google.com provider');

    // 5. Verify permission evaluation is strictly UID/claims-bound, never email-string bound
    await adb.doc(`platformAccess/${initialUid}`).set({
      role: 'super_admin',
      status: 'active',
      name: '통합 슈퍼관리자',
      email: 'arbitrary-unmatched-email@other.test' // Email does NOT need to match!
    });

    const token = await linkResult.user.getIdToken(true);
    const sessionRes = await call('authSession', { companyId: 'linker_x_hq' }, token);
    assert.equal(sessionRes.status, 200, JSON.stringify(sessionRes.body));
    assert.equal(sessionRes.body.result.role, 'super_admin');
    assert.equal(sessionRes.body.result.isPlatformAdmin, true);
    assert.equal(sessionRes.body.result.authUid, initialUid);

    await signOut(auth);
  });
});

describe('Defect 2: Operations Team Role Update Contract, Whitelist & Lifecycle', () => {
  test('Role update enforces newRole contract, whitelist, tenantBusinessData:false, and revocation preserves tenant memberships', async () => {
    // Setup SuperAdmin in emulator
    const superUid = `super_${Date.now()}`;
    await aAuth.createUser({ uid: superUid, email: 'super@hq.test', emailVerified: true });
    await adb.doc(`platformAccess/${superUid}`).set({
      role: 'super_admin',
      status: 'active'
    });
    const superToken = await aAuth.createCustomToken(superUid);
    // Sign in superadmin to get idToken
    const superCred = await aAuth.getUser(superUid);
    const customSuperIdToken = (await (await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: superToken, returnSecureToken: true })
    })).json()).idToken;

    // 1. Create a platform staff member
    const staffUid = `staff_user_${Date.now()}`;
    const staffEmail = `staff_${Date.now()}@linker-x.com`;
    await aAuth.createUser({ uid: staffUid, email: staffEmail, emailVerified: true });
    
    // Also give this staff a preexisting tenant membership (e.g. at company 'C_TENANT')
    await adb.doc(`companies/C_TENANT`).set({ id: 'C_TENANT', name: '동명크릴', status: 'active' });
    await adb.doc(`authz/${staffUid}/companies/C_TENANT`).set({
      uid: staffUid,
      companyId: 'C_TENANT',
      legacyId: 'dmkr_staff_01',
      role: 'tenant_staff',
      status: 'active'
    });

    const staffId = `pstaff_${Date.now()}`;
    await adb.doc(`platformStaff/${staffId}`).set({
      id: staffId,
      name: '홍길동',
      email: staffEmail,
      role: 'support',
      accountStatus: 'linked',
      linkedUid: staffUid,
      linkedEmail: staffEmail
    });
    await adb.doc(`platformAccess/${staffUid}`).set({
      role: 'support',
      status: 'active',
      staffId
    });

    // 2. Reject role change with invalid role
    const invalidRes = await call('updatePlatformStaffRole', {
      staffId,
      newRole: 'super_admin' // Only 'support', 'subscription', 'developer' are allowed for staff
    }, customSuperIdToken);
    assert.equal(invalidRes.status, 400, 'Must reject role outside whitelist');

    // 3. Update role with newRole (and role compatibility)
    const updateRes = await call('updatePlatformStaffRole', {
      staffId,
      newRole: 'subscription',
      role: 'subscription'
    }, customSuperIdToken);
    assert.equal(updateRes.status, 200, JSON.stringify(updateRes.body));

    // Verify platformStaff document updated
    const staffDoc = await adb.doc(`platformStaff/${staffId}`).get();
    assert.equal(staffDoc.data().role, 'subscription');
    assert.equal(staffDoc.data().permissions.tenantBusinessData, false, 'tenantBusinessData must be false');
    assert.equal(staffDoc.data().permissions.subscriptionManage, true);

    // Verify platformAccess document updated
    const accessDoc = await adb.doc(`platformAccess/${staffUid}`).get();
    assert.equal(accessDoc.data().role, 'subscription');
    assert.equal(accessDoc.data().permissions.tenantBusinessData, false, 'tenantBusinessData must be false');

    // 4. Revoke access
    const revokeRes = await call('revokePlatformStaffAccess', { staffId }, customSuperIdToken);
    assert.equal(revokeRes.status, 200, JSON.stringify(revokeRes.body));

    // Platform access must be revoked
    const revokedAccessDoc = await adb.doc(`platformAccess/${staffUid}`).get();
    assert.equal(revokedAccessDoc.data().status, 'revoked');

    // Tenant membership MUST BE FULLY PRESERVED
    const preservedTenantMem = await adb.doc(`authz/${staffUid}/companies/C_TENANT`).get();
    assert.ok(preservedTenantMem.exists, 'Tenant membership must remain intact');
    assert.equal(preservedTenantMem.data().status, 'active', 'Tenant membership must remain active');
    assert.equal(preservedTenantMem.data().companyId, 'C_TENANT');
  });
});

describe('Defect 3: Representative Email Connection without Fallbacks', () => {
  test('requestStaffConnection checks real database matching and returns 404 for unlisted or fallback emails', async () => {
    const userUid = `user_applicant_${Date.now()}`;
    await aAuth.createUser({ uid: userUid, email: 'applicant@example.test', emailVerified: true });
    const userCustomToken = await aAuth.createCustomToken(userUid);
    const userIdToken = (await (await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: userCustomToken, returnSecureToken: true })
    })).json()).idToken;

    // 1. Unregistered arbitrary email -> 404 not-found
    const unregRes = await call('requestStaffConnection', {
      representativeEmail: 'nonexistent_ceo@randomcorp.test'
    }, userIdToken);
    assert.equal(unregRes.status, 404, 'Must return not-found (404) for unlisted email');

    // 2. Previously hardcoded emails like ceo@dmkr.com must NOT resolve without real company record
    const hardcodedRes = await call('requestStaffConnection', {
      representativeEmail: 'ceo@dmkr.com'
    }, userIdToken);
    assert.equal(hardcodedRes.status, 404, 'Must return not-found (404) for ceo@dmkr.com if not in DB');

    // 3. Registered company matching representativeEmail -> succeeds
    const cid = `comp_${Date.now()}`;
    const repEmail = `real_rep_${Date.now()}@dmkr.com`;
    await adb.doc(`companies/${cid}`).set({
      id: cid,
      name: '실제 등록된 동명크릴',
      representativeEmail: repEmail,
      status: 'active'
    });

    const successRes = await call('requestStaffConnection', {
      representativeEmail: repEmail
    }, userIdToken);
    assert.equal(successRes.status, 200, JSON.stringify(successRes.body));
    assert.equal(successRes.body.result.companyId, cid);
    assert.equal(successRes.body.result.companyName, '실제 등록된 동명크릴');
  });
});

describe('Defect 4: Tenant Signup Immediate Access & Full Invitation Lifecycle', () => {
  test('New tenant signup grants active admin membership immediately, staff invitation and partner order invitation work end-to-end', async () => {
    // 1. New tenant signup
    const ceoUid = `ceo_${Date.now()}`;
    const ceoEmail = `ceo_${Date.now()}@newcorp.com`;
    await aAuth.createUser({ uid: ceoUid, email: ceoEmail, emailVerified: true });
    const ceoCustomToken = await aAuth.createCustomToken(ceoUid);
    const ceoIdToken = (await (await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: ceoCustomToken, returnSecureToken: true })
    })).json()).idToken;

    const signupRes = await call('registerNewTenantDirect', {
      companyName: '신규 혁신상사',
      businessNo: '123-45-67890',
      name: '김대표',
      phone: '010-1234-5678'
    }, ceoIdToken);

    assert.equal(signupRes.status, 200, JSON.stringify(signupRes.body));
    const newCid = signupRes.body.result.companyId;
    assert.ok(newCid, 'Company ID must be automatically generated');
    assert.equal(signupRes.body.result.status, 'active', 'Company must be active immediately');

    // Verify immediate session entry
    const sessionRes = await call('authSession', { companyId: newCid }, ceoIdToken);
    assert.equal(sessionRes.status, 200, JSON.stringify(sessionRes.body));
    assert.equal(sessionRes.body.result.role, 'admin');
    assert.equal(sessionRes.body.result.status, 'active');

    // Verify auto-created representative staff account & default warehouse in Firestore
    const repStaffSnap = await adb.doc(`companies/${newCid}/staffList/${ceoUid}`).get();
    assert.ok(repStaffSnap.exists, 'Representative staff profile must be automatically created in staffList');
    const repStaffData = repStaffSnap.data();
    assert.equal(repStaffData.userId, ceoEmail.split('@')[0], 'Representative userId must match CEO email prefix');
    assert.equal(repStaffData.name, '김대표');
    assert.equal(repStaffData.phone, '010-1234-5678');
    assert.equal(repStaffData.role, 'admin');
    assert.equal(repStaffData.jobTitle, '대표');
    assert.equal(repStaffData.warehouse, '기본 창고');
    assert.equal(repStaffData.accountStatus, 'linked');

    const defaultWhSnap = await adb.doc(`companies/${newCid}/warehouses/wh_default`).get();
    assert.ok(defaultWhSnap.exists, 'Default warehouse must be automatically created in warehouses');
    const defaultWhData = defaultWhSnap.data();
    assert.equal(defaultWhData.name, '기본 창고');
    assert.equal(defaultWhData.isMain, true);
    assert.equal(defaultWhData.manager, '김대표');

    // 2. CEO invites a staff member
    const staffTargetEmail = `invite_staff_${Date.now()}@newcorp.com`;
    const staffId = `staff_${Date.now()}`;
    await adb.doc(`companies/${newCid}/staffList/${staffId}`).set({
      id: staffId,
      name: '이직원',
      role: '대리',
      permissions: { orders: true, loading: true }
    });

    const inviteRes = await call('createStaffInvitation', {
      companyId: newCid,
      staffId,
      staffName: '이직원',
      targetEmail: staffTargetEmail,
      role: 'tenant_staff'
    }, ceoIdToken);
    assert.equal(inviteRes.status, 200, JSON.stringify(inviteRes.body));
    const invId = inviteRes.body.result.invitationId;
    assert.ok(invId);

    // Staff user accepts invitation
    const staffUid = `staff_acc_${Date.now()}`;
    await aAuth.createUser({ uid: staffUid, email: staffTargetEmail, emailVerified: true });
    const staffCustomToken = await aAuth.createCustomToken(staffUid);
    const staffIdToken = (await (await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: staffCustomToken, returnSecureToken: true })
    })).json()).idToken;

    const acceptRes = await call('acceptInvitation', {
      invitationId: invId
    }, staffIdToken);
    assert.equal(acceptRes.status, 200, JSON.stringify(acceptRes.body));

    // Verify staff can now enter company session
    const staffSession = await call('authSession', { companyId: newCid }, staffIdToken);
    assert.equal(staffSession.status, 200, JSON.stringify(staffSession.body));
    assert.equal(staffSession.body.result.role, 'staff');

    // 3. CEO invites partner for orders
    const partnerId = `part_${Date.now()}`;
    await adb.doc(`companies/${newCid}/partners/${partnerId}`).set({
      id: partnerId,
      name: '해운물류거래처',
      email: `partner_${Date.now()}@partner.com`
    });

    const partnerInviteRes = await call('createPartnerInvitation', {
      companyId: newCid,
      partnerId,
      targetEmail: `partner_${Date.now()}@partner.com`
    }, ceoIdToken);
    assert.equal(partnerInviteRes.status, 200, JSON.stringify(partnerInviteRes.body));
    assert.ok(partnerInviteRes.body.result.invitationId);
  });
});

describe('Company deletion: confirmed server-side recursive cleanup', () => {
  test('Superadmin deletion removes nested business data and external identity references', async () => {
    const suffix = Date.now();
    const cid = `delete_me_${suffix}`;
    const superUid = `delete_super_${suffix}`;
    await aAuth.createUser({ uid: superUid, email: `delete_super_${suffix}@hq.test`, emailVerified: true });
    await adb.doc(`platformAccess/${superUid}`).set({ role: 'super_admin', status: 'active' });
    const superToken = await aAuth.createCustomToken(superUid);
    const idToken = (await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: superToken, returnSecureToken: true })
    })).json()).idToken;

    const memberUid = `delete_member_${suffix}`;
    await adb.doc(`companies/${cid}`).set({ id: cid, name: '삭제 검증 회원사', status: 'active' });
    await adb.doc(`companies/${cid}/staffList/staff-1`).set({ id: 'staff-1', companyId: cid });
    await adb.doc(`companies/${cid}/serverBackups/bk-1/chunks/0`).set({ content: 'nested backup payload' });
    await adb.doc(`authz/${memberUid}/companies/${cid}`).set({ uid: memberUid, companyId: cid, status: 'active' });
    await adb.doc(`identityBindings/delete-binding-${suffix}`).set({ uid: memberUid, companyId: cid });
    await adb.doc(`invitations/delete-invitation-${suffix}`).set({ companyId: cid, status: 'pending' });

    const denied = await call('deleteCompanyPermanently', { companyId: cid, confirmCompanyId: 'wrong-id' }, idToken);
    assert.equal(denied.status, 400, 'A mismatched typed company ID must be rejected');
    assert.equal((await adb.doc(`companies/${cid}`).get()).exists, true, 'Rejected deletion must keep the company');

    const deleted = await call('deleteCompanyPermanently', { companyId: cid, confirmCompanyId: cid }, idToken);
    assert.equal(deleted.status, 200, JSON.stringify(deleted.body));
    assert.equal((await adb.doc(`companies/${cid}`).get()).exists, false);
    assert.equal((await adb.doc(`companies/${cid}/staffList/staff-1`).get()).exists, false);
    assert.equal((await adb.doc(`companies/${cid}/serverBackups/bk-1/chunks/0`).get()).exists, false, 'Nested backup chunks must be recursively removed');
    assert.equal((await adb.doc(`authz/${memberUid}/companies/${cid}`).get()).exists, false, 'Membership must be removed');
    assert.equal((await adb.doc(`identityBindings/delete-binding-${suffix}`).get()).exists, false, 'Identity binding must be removed');
    assert.equal((await adb.doc(`invitations/delete-invitation-${suffix}`).get()).exists, false, 'Invitation must be removed');
  });
});
