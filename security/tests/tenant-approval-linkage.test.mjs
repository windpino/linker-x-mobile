import { test } from 'node:test';
import assert from 'node:assert/strict';

// In-memory mock harness simulating Firestore rules, Functions v2, and local client store
class MockTenantSystem {
  constructor() {
    this.companies = new Map([
      ['no1dmkr', {
        id: 'no1dmkr',
        name: '동명크릴',
        ceo: '김동영',
        status: 'active',
        category: '수산물/유통'
      }]
    ]);
    this.authz = new Map(); // key: `${uid}_${companyId}`
    this.requests = new Map(); // key: requestId
    this.sampleData = new Map([
      ['no1dmkr_orders', [
        { id: 'ORD-001', partnerName: '남해낚시마트', productName: '크릴새우 1kg', qty: 50, amount: 275000, companyId: 'no1dmkr' },
        { id: 'ORD-002', partnerName: '여수레저', productName: '제주 각크릴', qty: 30, amount: 180000, companyId: 'no1dmkr' }
      ]],
      ['no1dmkr_inventory', {
        '동명크릴 메인창고': { '크릴새우 1kg': 1500, '남해 생새우': 800, '제주 각크릴': 1200 }
      }],
      ['no1dmkr_invoices', [
        { id: 'INV-001', partnerName: '남해낚시마트', totalAmount: 275000, companyId: 'no1dmkr' }
      ]]
    ]);
  }

  // 1. Applicant submits membership request without 'desired companyId'
  submitNewTenantRequest(uid, email, { companyName, businessNo, name, phone }) {
    if (!companyName || !businessNo || !name || !phone) {
      throw new Error('필수 회사 정보가 누락되었습니다.');
    }
    const requestId = `req_${uid}`;
    const requestData = {
      id: requestId,
      uid,
      email,
      role: 'tenant_admin',
      companyId: 'pending', // No applicant-chosen companyId!
      profile: { companyName, businessNo, name, phone },
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.requests.set(requestId, requestData);
    return requestData;
  }

  // 2. Superadmin approves by linking to an EXISTING company (e.g. no1dmkr)
  approveLinkToExistingCompany(superAdminUid, applicantUid, targetCompanyId) {
    const existingCompany = this.companies.get(targetCompanyId);
    if (!existingCompany || existingCompany.status !== 'active') {
      throw new Error(`존재하지 않거나 비활성화된 회원사입니다: ${targetCompanyId}`);
    }

    const request = this.requests.get(`req_${applicantUid}`);
    if (!request || request.status !== 'pending') {
      throw new Error('대기 중인 신청 내역이 없습니다.');
    }

    // Bind applicant UID to target company as tenant_admin
    const membership = {
      uid: applicantUid,
      companyId: targetCompanyId,
      companyName: existingCompany.name,
      role: 'tenant_admin',
      status: 'active',
      approvedBy: superAdminUid,
      approvedAt: new Date().toISOString()
    };
    this.authz.set(`${applicantUid}_${targetCompanyId}`, membership);

    // Mark request approved
    request.status = 'approved';
    request.companyId = targetCompanyId;
    request.approvedBy = superAdminUid;
    request.approvedAt = new Date().toISOString();

    return { membership, company: existingCompany };
  }

  // 3. Superadmin approves by opening a NEW company with server-issued ID
  approveOpenNewCompany(superAdminUid, applicantUid) {
    const request = this.requests.get(`req_${applicantUid}`);
    if (!request || request.status !== 'pending') {
      throw new Error('대기 중인 신청 내역이 없습니다.');
    }

    // Server generates internal company ID
    const newCompanyId = `comp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newCompany = {
      id: newCompanyId,
      name: request.profile.companyName,
      ceo: request.profile.name,
      contact: request.profile.phone,
      businessNo: request.profile.businessNo,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    this.companies.set(newCompanyId, newCompany);

    // Initialize fresh empty collections for the new company
    this.sampleData.set(`${newCompanyId}_orders`, []);
    this.sampleData.set(`${newCompanyId}_inventory`, {});
    this.sampleData.set(`${newCompanyId}_invoices`, []);

    // Bind applicant UID to new company as tenant_admin
    const membership = {
      uid: applicantUid,
      companyId: newCompanyId,
      companyName: newCompany.name,
      role: 'tenant_admin',
      status: 'active',
      approvedBy: superAdminUid,
      approvedAt: new Date().toISOString()
    };
    this.authz.set(`${applicantUid}_${newCompanyId}`, membership);

    // Mark request approved
    request.status = 'approved';
    request.companyId = newCompanyId;
    request.approvedBy = superAdminUid;
    request.approvedAt = new Date().toISOString();

    return { membership, company: newCompany };
  }

  // 4. Auto-resolve user session on login without companyId input
  resolveUserSessionOnLogin(uid) {
    // Look up active memberships for UID
    const userMemberships = [];
    for (const [key, mem] of this.authz.entries()) {
      if (mem.uid === uid && mem.status === 'active') {
        userMemberships.push(mem);
      }
    }

    if (userMemberships.length === 0) {
      // Check if pending request exists
      const request = this.requests.get(`req_${uid}`);
      if (request && request.status === 'pending') {
        return { status: 'pending', request };
      }
      return { status: 'unregistered' };
    }

    // Direct entry into approved company
    const activeMem = userMemberships.find(m => m.role === 'tenant_admin') || userMemberships[0];
    const company = this.companies.get(activeMem.companyId);

    return {
      status: 'approved',
      session: {
        authUid: uid,
        companyId: activeMem.companyId,
        companyName: company?.name || activeMem.companyId,
        role: activeMem.role === 'tenant_admin' ? 'admin' : 'staff',
        authRole: activeMem.role,
        status: 'active'
      },
      data: {
        orders: this.sampleData.get(`${activeMem.companyId}_orders`) || [],
        inventory: this.sampleData.get(`${activeMem.companyId}_inventory`) || {},
        invoices: this.sampleData.get(`${activeMem.companyId}_invoices`) || []
      }
    };
  }
}

test('1. Applicant signup form: No desired companyId required, submitted as pending', () => {
  const system = new MockTenantSystem();
  const applicantUid = 'uid-dongmyeong-rep-applicant';
  const email = 'new-rep@example.com';

  const req = system.submitNewTenantRequest(applicantUid, email, {
    companyName: '동명크릴',
    businessNo: '608-05-12345',
    name: '김대표',
    phone: '010-1234-5678'
  });

  assert.equal(req.companyId, 'pending', 'Applicant cannot specify desired company ID');
  assert.equal(req.status, 'pending');
  assert.equal(req.profile.companyName, '동명크릴');

  // Pre-approval login attempt must not enter workspace
  const preApproval = system.resolveUserSessionOnLogin(applicantUid);
  assert.equal(preApproval.status, 'pending');
  assert.equal(preApproval.session, undefined);
});

test('2. Superadmin approves with [기존 회원사에 연결] -> Dongmyeong Krill (no1dmkr)', () => {
  const system = new MockTenantSystem();
  const superAdminUid = 'uid-superadmin';
  const applicantUid = 'uid-dongmyeong-approved-rep';
  const email = 'rep@dongmyeong.kr';

  // 1) Applicant requests
  system.submitNewTenantRequest(applicantUid, email, {
    companyName: '동명크릴 (신청)',
    businessNo: '608-05-12345',
    name: '김동명',
    phone: '010-9876-5432'
  });

  // 2) Superadmin explicitly selects 'no1dmkr'
  const result = system.approveLinkToExistingCompany(superAdminUid, applicantUid, 'no1dmkr');

  assert.equal(result.membership.companyId, 'no1dmkr');
  assert.equal(result.membership.role, 'tenant_admin');
  assert.equal(result.membership.status, 'active');
  assert.equal(result.company.id, 'no1dmkr');
  assert.equal(result.company.name, '동명크릴');

  // 3) User logs in -> Auto-enters 'no1dmkr' without typing company ID
  const loginResult = system.resolveUserSessionOnLogin(applicantUid);
  assert.equal(loginResult.status, 'approved');
  assert.equal(loginResult.session.companyId, 'no1dmkr');
  assert.equal(loginResult.session.role, 'admin');

  // 4) Existing sample orders, inventory, and invoices are visible
  assert.equal(loginResult.data.orders.length, 2, 'Must display Dongmyeong Krill sample orders');
  assert.equal(loginResult.data.orders[0].productName, '크릴새우 1kg');
  assert.equal(Boolean(loginResult.data.inventory['동명크릴 메인창고']), true, 'Must display Dongmyeong Krill inventory');
  assert.equal(loginResult.data.invoices.length, 1, 'Must display Dongmyeong Krill sample invoices');
});

test('3. Superadmin approves with [새 회원사 개설] -> Server issues internal company ID and isolates data', () => {
  const system = new MockTenantSystem();
  const superAdminUid = 'uid-superadmin';
  const applicantUid = 'uid-brand-new-corp';
  const email = 'ceo@oceanmarine.test';

  // 1) Applicant requests
  system.submitNewTenantRequest(applicantUid, email, {
    companyName: '(주)오션마린',
    businessNo: '111-22-33333',
    name: '박바다',
    phone: '010-5555-7777'
  });

  // 2) Superadmin approves as new company
  const result = system.approveOpenNewCompany(superAdminUid, applicantUid);

  assert.equal(result.company.name, '(주)오션마린');
  assert.equal(result.company.id.startsWith('comp_'), true, 'Server must generate internal ID starting with comp_');
  assert.notEqual(result.company.id, 'no1dmkr');

  // 3) User logs in -> Auto-enters newly created company
  const loginResult = system.resolveUserSessionOnLogin(applicantUid);
  assert.equal(loginResult.status, 'approved');
  assert.equal(loginResult.session.companyId, result.company.id);
  assert.equal(loginResult.session.companyName, '(주)오션마린');
  assert.equal(loginResult.session.role, 'admin');

  // 4) New company has isolated fresh empty data (does NOT inherit Dongmyeong Krill data)
  assert.equal(loginResult.data.orders.length, 0, 'New company must have 0 orders');
  assert.deepEqual(loginResult.data.inventory, {}, 'New company must have empty inventory');
  assert.equal(loginResult.data.invoices.length, 0, 'New company must have 0 invoices');
});

test('4. Zero auto-linking by email or company name without Superadmin explicit action', () => {
  const system = new MockTenantSystem();
  const unapprovedUid = 'uid-fake-rep';

  // Even if companyName is '동명크릴' and email is similar
  system.submitNewTenantRequest(unapprovedUid, 'windpino@gmail.com', {
    companyName: '동명크릴',
    businessNo: '608-05-12345',
    name: '해커',
    phone: '010-0000-0000'
  });

  // Must not have access without explicit approval
  const result = system.resolveUserSessionOnLogin(unapprovedUid);
  assert.equal(result.status, 'pending');
  assert.equal(result.session, undefined, 'Must never auto-link to Dongmyeong Krill without SuperAdmin approval');
});
