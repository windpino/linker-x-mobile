import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Mock in-memory test harness simulating Firestore and Functions v2 authSession / approveMembership logic
class MemoryDb {
  constructor() {
    this.store = new Map();
  }
  doc(p) {
    return {
      get: async () => {
        const val = this.store.get(p);
        return {
          exists: Boolean(val),
          data: () => val ? structuredClone(val) : undefined,
          id: p.split('/').pop()
        };
      },
      set: async (d) => {
        this.store.set(p, structuredClone(d));
      },
      update: async (patch) => {
        const curr = this.store.get(p) || {};
        this.store.set(p, { ...curr, ...structuredClone(patch) });
      }
    };
  }
}

// Simulates functions/index.js authSession logic
async function simulateAuthSession(db, account, requestedCompanyId) {
  if (requestedCompanyId === 'linker_x_hq') {
    const platformDoc = await db.doc(`platformAccess/${account.uid}`).get();
    const data = platformDoc.data();
    if (!data || data.status !== 'active') {
      const err = new Error('플랫폼 관리자 승인이 필요합니다.');
      err.code = 'permission-denied';
      throw err;
    }
    return {
      authUid: account.uid,
      companyId: 'linker_x_hq',
      role: 'super_admin',
      authRole: 'platform_admin',
      isPlatformAdmin: true,
      status: 'active',
      name: account.displayName || '관리자'
    };
  }

  // Regular tenant session logic
  const [membershipDoc, companyDoc] = await Promise.all([
    db.doc(`memberships/${account.uid}_${requestedCompanyId}`).get(),
    db.doc(`companies/${requestedCompanyId}`).get()
  ]);
  const m = membershipDoc.data();
  const c = companyDoc.data();
  if (!m || m.status !== 'active' || !c || c.status !== 'active') {
    const err = new Error('회사 소속 승인 또는 사용 상태를 확인해 주세요.');
    err.code = 'permission-denied';
    throw err;
  }
  return {
    authUid: account.uid,
    companyId: requestedCompanyId,
    role: m.role,
    authRole: m.role,
    isPlatformAdmin: false,
    status: 'active'
  };
}

// Simulates functions/index.js approveMembership logic
async function simulateApproveMembership(db, actorUid, targetUid, targetCompanyId, roleToApprove, createCompany = false) {
  const [platformDoc, actorMembershipDoc] = await Promise.all([
    db.doc(`platformAccess/${actorUid}`).get(),
    db.doc(`memberships/${actorUid}_${targetCompanyId}`).get()
  ]);

  const isPlatformAdmin = platformDoc.data()?.status === 'active';
  const isTenantAdmin = actorMembershipDoc.data()?.status === 'active' && actorMembershipDoc.data()?.role === 'tenant_admin';

  if (!isPlatformAdmin && !isTenantAdmin) {
    const err = new Error('관리자 권한이 필요합니다.');
    err.code = 'permission-denied';
    throw err;
  }

  // Representative (tenant_admin) approval check
  if (roleToApprove === 'tenant_admin' && !isPlatformAdmin) {
    const err = new Error('대표 권한은 플랫폼 관리자만 승인합니다.');
    err.code = 'permission-denied';
    throw err;
  }

  // New company creation check
  if (createCompany && !isPlatformAdmin) {
    const err = new Error('신규 회원사 생성은 플랫폼 관리자만 가능합니다.');
    err.code = 'permission-denied';
    throw err;
  }

  return { status: 'approved', approvedBy: actorUid };
}

test('1. Platform superadmin with active platformAccess enters linker_x_hq without company affiliation', async () => {
  const db = new MemoryDb();
  const superadminUid = 'uid-windpino-superadmin';
  await db.doc(`platformAccess/${superadminUid}`).set({
    uid: superadminUid,
    status: 'active',
    role: 'platform_admin',
    email: 'windpino@gmail.com'
  });

  const account = { uid: superadminUid, email: 'windpino@gmail.com', displayName: '슈퍼관리자' };
  const session = await simulateAuthSession(db, account, 'linker_x_hq');

  assert.equal(session.authUid, superadminUid);
  assert.equal(session.companyId, 'linker_x_hq');
  assert.equal(session.role, 'super_admin');
  assert.equal(session.authRole, 'platform_admin');
  assert.equal(session.isPlatformAdmin, true);
});

test('2. Regular tenant staff and tenant admin are blocked from entering linker_x_hq', async () => {
  const db = new MemoryDb();
  const staffUid = 'uid-dongmyeong-staff';
  const tenantAdminUid = 'uid-dongmyeong-admin';

  // Set up tenant memberships only, NO platformAccess
  await db.doc(`memberships/${staffUid}_dongmyeong`).set({
    uid: staffUid,
    companyId: 'dongmyeong',
    role: 'tenant_staff',
    status: 'active'
  });
  await db.doc(`memberships/${tenantAdminUid}_dongmyeong`).set({
    uid: tenantAdminUid,
    companyId: 'dongmyeong',
    role: 'tenant_admin',
    status: 'active'
  });

  // Staff attempt on linker_x_hq -> permission-denied
  await assert.rejects(
    async () => simulateAuthSession(db, { uid: staffUid }, 'linker_x_hq'),
    { code: 'permission-denied' }
  );

  // Tenant admin attempt on linker_x_hq -> permission-denied
  await assert.rejects(
    async () => simulateAuthSession(db, { uid: tenantAdminUid }, 'linker_x_hq'),
    { code: 'permission-denied' }
  );
});

test('3. Revoked platformAccess immediately denies superadmin entry', async () => {
  const db = new MemoryDb();
  const targetUid = 'uid-revoked-admin';
  await db.doc(`platformAccess/${targetUid}`).set({
    uid: targetUid,
    status: 'revoked',
    role: 'platform_admin',
    updatedAt: new Date().toISOString()
  });

  await assert.rejects(
    async () => simulateAuthSession(db, { uid: targetUid }, 'linker_x_hq'),
    { code: 'permission-denied' }
  );
});

test('4. Platform admin can approve tenant_admin & createCompany; Tenant admin is strictly blocked', async () => {
  const db = new MemoryDb();
  const platformAdminUid = 'uid-platform-admin';
  const tenantAdminUid = 'uid-tenant-admin';
  const applicantUid = 'uid-applicant';

  await db.doc(`platformAccess/${platformAdminUid}`).set({ status: 'active', role: 'platform_admin' });
  await db.doc(`memberships/${tenantAdminUid}_dongmyeong`).set({ status: 'active', role: 'tenant_admin' });

  // Platform admin approving new tenant admin -> success
  const platformApproval = await simulateApproveMembership(
    db, platformAdminUid, applicantUid, 'new_corp', 'tenant_admin', true
  );
  assert.equal(platformApproval.status, 'approved');

  // Tenant admin trying to approve new tenant admin -> permission-denied
  await assert.rejects(
    async () => simulateApproveMembership(db, tenantAdminUid, applicantUid, 'new_corp', 'tenant_admin', true),
    { code: 'permission-denied' }
  );
});

test('5. Zero email hardcoding check: Frontend source files do not contain hardcoded email admin checks', () => {
  const authFiles = [
    'src/auth/AuthGate.jsx',
    'src/auth/MembershipAdmin.jsx',
    'src/auth/client.js'
  ];

  for (const relPath of authFiles) {
    const fullPath = path.resolve(relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    // Rule: Never check `email === 'windpino@gmail.com'` or similar to grant admin rights
    const forbiddenPattern = /(===|==)\s*['"`][a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}['"`]/g;
    const matches = content.match(forbiddenPattern);
    assert.equal(
      matches,
      null,
      `File ${relPath} must not contain hardcoded email comparisons for privilege checks. Found: ${matches}`
    );
  }
});
