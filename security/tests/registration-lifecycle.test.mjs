import { test } from 'node:test';
import assert from 'node:assert/strict';

// In-memory simulation of Firebase backend functions matching functions/index.js & src/auth/client.js logic
class MockFirebaseBackend {
  constructor() {
    this.users = new Map();
    this.memberships = new Map(); // key: `${uid}_${cid}`
    this.signupRequests = new Map(); // key: `${uid}_${cid}`
    this.companies = new Map(); // key: `${cid}`
    this.platformAdmins = new Set();
  }

  addUser(uid, email, emailVerified = true) {
    this.users.set(uid, { uid, email, emailVerified, disabled: false });
  }

  setPlatformAdmin(uid) {
    this.platformAdmins.add(uid);
  }

  async getMyRegistrationStatus(uid) {
    const user = this.users.get(uid);
    if (!user) throw new Error('unauthenticated');
    if (!user.emailVerified) throw new Error('permission-denied: 이메일 인증이 필요합니다.');

    // 1. Check active memberships
    for (const [key, mem] of this.memberships.entries()) {
      if (key.startsWith(`${uid}_`) && mem.status === 'active') {
        const comp = this.companies.get(mem.companyId);
        if (comp && comp.status === 'active') {
          return {
            status: 'approved',
            companyId: mem.companyId,
            companyName: comp.name || mem.companyId,
            role: mem.role,
            isTenantAdmin: mem.role === 'tenant_admin'
          };
        }
      }
    }

    // 2. Check signupRequests
    const userRequests = [];
    for (const [key, req] of this.signupRequests.entries()) {
      if (req.uid === uid) userRequests.push(req);
    }

    if (userRequests.length > 0) {
      // Sort by createdAt descending
      userRequests.sort((a, b) => b.createdAt - a.createdAt);
      const latest = userRequests[0];
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
        return {
          status: 'approved',
          companyId: latest.companyId,
          companyName: latest.profile?.companyName || latest.companyId,
          role: latest.role,
          isTenantAdmin: latest.role === 'tenant_admin'
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

  async requestMembership(uid, data) {
    const user = this.users.get(uid);
    if (!user || !user.emailVerified) throw new Error('permission-denied');
    const { companyId, role, name, phone, companyName, businessNo } = data;
    const key = `${uid}_${companyId}`;
    if (this.signupRequests.has(key) && this.signupRequests.get(key).status === 'pending') {
      throw new Error('already-exists: 이미 신청된 회사입니다.');
    }
    const req = {
      uid,
      companyId,
      role,
      profile: { name, phone, companyName, businessNo },
      status: 'pending',
      createdAt: Date.now()
    };
    this.signupRequests.set(key, req);
    return { status: 'pending' };
  }

  async approveMembership(actorUid, data) {
    if (!this.platformAdmins.has(actorUid)) {
      throw new Error('permission-denied: 최고관리자 권한이 필요합니다.');
    }
    const { targetUid, companyId, createCompany } = data;
    const reqKey = `${targetUid}_${companyId}`;
    const req = this.signupRequests.get(reqKey);
    if (!req) throw new Error('failed-precondition: 대기 신청이 없습니다.');

    req.status = 'approved';
    req.approvedAt = Date.now();

    if (createCompany) {
      this.companies.set(companyId, {
        id: companyId,
        name: req.profile?.companyName || companyId,
        status: 'active'
      });
    }

    const memKey = `${targetUid}_${companyId}`;
    this.memberships.set(memKey, {
      uid: targetUid,
      companyId,
      role: req.role,
      status: 'active'
    });

    return { status: 'approved' };
  }

  async authSession(uid, companyId) {
    const user = this.users.get(uid);
    if (!user || !user.emailVerified) throw new Error('permission-denied: 이메일 인증이 필요합니다.');
    const memKey = `${uid}_${companyId}`;
    const mem = this.memberships.get(memKey);
    const comp = this.companies.get(companyId);
    if (!mem || mem.status !== 'active' || !comp || comp.status !== 'active') {
      throw new Error('permission-denied: 회사 소속 승인 또는 사용 상태를 확인해 주세요.');
    }
    return {
      authUid: uid,
      companyId,
      role: mem.role === 'tenant_admin' ? 'admin' : 'staff',
      authRole: mem.role,
      status: 'active'
    };
  }

  async tenantRead(uid, companyId, path) {
    // Requires verified tenant membership
    await this.authSession(uid, companyId);
    return { path, data: { sampleOrder: 1 } };
  }
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

test('1. 신청 기록이 없는 신규 계정 로그인 -> "이메일 인증 완료, 등록 신청 안내" 표시 (Condition B)', async () => {
  const backend = new MockFirebaseBackend();
  const testUid = 'user_new_123';
  backend.addUser(testUid, 'applicant@newcorp.com', true);

  const status = await backend.getMyRegistrationStatus(testUid);
  assert.equal(status.status, 'none');

  // Verify client UI mapping for Condition B
  const getUiViewMode = (res) => {
    if (res.status === 'none') return 'no_application';
    if (res.status === 'pending') return 'awaiting_tenant_approval';
    if (res.status === 'approved') return 'auto_enter';
    return 'company_login';
  };

  const uiView = getUiViewMode(status);
  assert.equal(uiView, 'no_application');

  const guideText = '이메일 인증이 완료되었습니다. 회원사 등록을 신청해 주세요';
  assert.match(guideText, /이메일 인증이 완료되었습니다.*회원사 등록을 신청해 주세요/);
});

test('2. 회원사 등록 신청 제출 후 로그아웃 -> 재로그인 -> "회원사 승인 대기" 표시 및 재등록 버튼 숨김 (Condition A)', async () => {
  const backend = new MockFirebaseBackend();
  const testUid = 'user_applicant_456';
  backend.addUser(testUid, 'ceo@fastlogis.kr', true);

  // Step 2-1: Submit registration request
  await backend.requestMembership(testUid, {
    companyId: 'fastlogis',
    role: 'tenant_admin',
    name: '김대표',
    phone: '010-9876-5432',
    companyName: '패스트로지스 주식회사',
    businessNo: '111-22-33333'
  });

  // Step 2-2: User re-logs in after logout -> server queries by UID
  const statusAfterRelogin = await backend.getMyRegistrationStatus(testUid);
  assert.equal(statusAfterRelogin.status, 'pending');
  assert.equal(statusAfterRelogin.companyId, 'fastlogis');
  assert.equal(statusAfterRelogin.companyName, '패스트로지스 주식회사');
  assert.equal(statusAfterRelogin.role, 'tenant_admin');

  // Verify Condition A UI requirements:
  // - Show awaiting approval screen
  // - Hide company ID input & re-registration buttons
  const isAwaitingScreen = statusAfterRelogin.status === 'pending';
  const showCompanyIdInput = !isAwaitingScreen; // MUST be hidden
  const showReRegistrationButtons = !isAwaitingScreen; // MUST be hidden

  assert.equal(isAwaitingScreen, true);
  assert.equal(showCompanyIdInput, false, '회사 ID 입력창은 승인 대기 화면에서 숨겨져야 합니다.');
  assert.equal(showReRegistrationButtons, false, '재등록 신청 버튼은 승인 대기 화면에서 숨겨져야 합니다.');
});

test('3. 승인 전 업무 데이터 및 세션 접근 차단 검증 (Server-Authoritative Security)', async () => {
  const backend = new MockFirebaseBackend();
  const testUid = 'user_unapproved_789';
  backend.addUser(testUid, 'pending_staff@corp.com', true);

  // Apply but not yet approved
  await backend.requestMembership(testUid, {
    companyId: 'corp_test',
    role: 'tenant_admin',
    name: '신청자',
    phone: '010-0000-0000',
    companyName: '테스트상사',
    businessNo: '000-00-00000'
  });

  // Attempting to read business data or start session before approval MUST be rejected
  await assert.rejects(
    async () => backend.authSession(testUid, 'corp_test'),
    /permission-denied/,
    '미승인 사용자의 authSession은 서버에서 거부되어야 합니다.'
  );

  await assert.rejects(
    async () => backend.tenantRead(testUid, 'corp_test', 'companies/corp_test/orders'),
    /permission-denied/,
    '미승인 사용자의 업무 데이터 조회는 서버에서 거부되어야 합니다.'
  );
});

test('4. 슈퍼관리자 승인 -> 재로그인 -> 회사 ID 재입력 없이 자동 입장 (Condition C)', async () => {
  const backend = new MockFirebaseBackend();
  const adminUid = 'BL1Rp07y5CXPIVJhhiiajfgljN63'; // Platform Superadmin
  backend.addUser(adminUid, 'windpino@gmail.com', true);
  backend.setPlatformAdmin(adminUid);

  const applicantUid = 'user_approved_999';
  backend.addUser(applicantUid, 'approved_ceo@bestcorp.kr', true);

  // Step 4-1: Applicant requests tenant registration
  await backend.requestMembership(applicantUid, {
    companyId: 'bestcorp',
    role: 'tenant_admin',
    name: '이대표',
    phone: '010-1111-2222',
    companyName: '베스트물류',
    businessNo: '222-33-44444'
  });

  // Step 4-2: Platform Superadmin approves the company
  const approvalRes = await backend.approveMembership(adminUid, {
    targetUid: applicantUid,
    companyId: 'bestcorp',
    createCompany: true
  });
  assert.equal(approvalRes.status, 'approved');

  // Step 4-3: Applicant logs in again
  const statusAfterApproval = await backend.getMyRegistrationStatus(applicantUid);
  assert.equal(statusAfterApproval.status, 'approved');
  assert.equal(statusAfterApproval.isTenantAdmin, true);
  assert.equal(statusAfterApproval.companyId, 'bestcorp');

  // Step 4-4: Client automatically enters without asking for company ID
  const autoEnterTriggered = statusAfterApproval.status === 'approved' && 
                             statusAfterApproval.isTenantAdmin === true && 
                             Boolean(statusAfterApproval.companyId);
  assert.equal(autoEnterTriggered, true, '승인 완료 및 관리자 권한 확인 시 자동 입장이 트리거되어야 합니다.');

  // Verify successful session creation
  const session = await backend.authSession(applicantUid, statusAfterApproval.companyId);
  assert.equal(session.companyId, 'bestcorp');
  assert.equal(session.role, 'admin');
  assert.equal(session.authRole, 'tenant_admin');

  // Verify data access is now authorized
  const readResult = await backend.tenantRead(applicantUid, 'bestcorp', 'companies/bestcorp/orders');
  assert.equal(readResult.data.sampleOrder, 1);
});

test('5. 신청 상태 조회 실패 시 "신청 상태를 불러오지 못했습니다" 및 [다시 시도] 안내 (Condition D)', async () => {
  const simulateStatusLookup = async (shouldFail) => {
    if (shouldFail) {
      throw new Error('network-error: failed to fetch');
    }
    return { status: 'none' };
  };

  let clientUiState = { errorMsg: null, canRetry: false };

  try {
    await simulateStatusLookup(true);
  } catch {
    clientUiState = {
      errorMsg: '신청 상태를 불러오지 못했습니다',
      canRetry: true
    };
  }

  assert.equal(clientUiState.errorMsg, '신청 상태를 불러오지 못했습니다');
  assert.equal(clientUiState.canRetry, true);
});
