import test from 'node:test';
import assert from 'node:assert/strict';

// Mock window and localStorage
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (i) => Array.from(store.keys())[i] || null
};

// Import client functions
const { initDongmyeongSampleData, callAuth } = await import('../../src/auth/client.js');

test('initDongmyeongSampleData binds windpino@naver.com as representative (userId: windpino, admin/tenant_admin)', () => {
  const uid = 'auth_uid_windpino_123';
  const email = 'windpino@naver.com';

  initDongmyeongSampleData(uid, email);

  // 1. Check dev_companies
  const companies = JSON.parse(localStorage.getItem('dev_companies') || '[]');
  const dmkr = companies.find(c => c.id === 'no1dmkr');
  assert.ok(dmkr, '동명크릴 회사가 등록되어 있어야 합니다.');
  assert.equal(dmkr.name, '동명크릴');
  assert.equal(dmkr.email, 'windpino@naver.com');
  assert.equal(dmkr.representativeEmail, 'windpino@naver.com');

  // 2. Check staffList_no1dmkr
  const staffList = JSON.parse(localStorage.getItem('staffList_no1dmkr') || '[]');
  const rep = staffList.find(s => s.userId === 'windpino' || s.jobTitle === '대표');
  assert.ok(rep, '대표 직원 카드가 등록되어 있어야 합니다.');
  assert.equal(rep.userId, 'windpino', '대표 ID는 windpino 여야 합니다.');
  assert.equal(rep.role, 'admin');
  assert.equal(rep.jobTitle, '대표');
  assert.equal(rep.isCompanyAdmin, true);
  assert.equal(rep.isMasterAdmin, true);
  assert.equal(rep.accountStatus, 'linked');
  assert.equal(rep.linkedEmail, 'windpino@naver.com');
  assert.equal(rep.linkedUid, uid);

  // 3. Check dev_memberships
  const memberships = JSON.parse(localStorage.getItem('dev_memberships') || '{}');
  const mem = memberships[`${uid}_no1dmkr`];
  assert.ok(mem, '소속 멤버십이 등록되어 있어야 합니다.');
  assert.equal(mem.role, 'tenant_admin');
  assert.equal(mem.userId, 'windpino');
  assert.equal(mem.companyId, 'no1dmkr');
  assert.equal(mem.status, 'active');
});

test('getMyWorkspaces and authSession grant full representative access to windpino@naver.com for no1dmkr', async () => {
  const mockUser = {
    uid: 'auth_uid_windpino_123',
    email: 'windpino@naver.com',
    displayName: '김동영',
    emailVerified: true
  };
  globalThis.window.__mockFirebaseUser = mockUser;

  // Test getMyWorkspaces
  const res = await callAuth('getMyWorkspaces');
  const dmkrWs = (res.workspaces || []).find(w => w.companyId === 'no1dmkr');
  assert.ok(dmkrWs, '워크스페이스 목록에 동명크릴이 포함되어야 합니다.');
  assert.equal(dmkrWs.isTenantAdmin, true);
  assert.equal(dmkrWs.authRole, 'tenant_admin');
  assert.equal(dmkrWs.role, 'admin');

  // Test authSession
  const session = await callAuth('authSession', { companyId: 'no1dmkr' });
  assert.equal(session.companyId, 'no1dmkr');
  assert.equal(session.userId, 'windpino', '대표 세션의 userId는 windpino 여야 합니다.');
  assert.equal(session.role, 'admin');
  assert.equal(session.authRole, 'tenant_admin');
  assert.equal(session.isTenantAdmin, true);
  assert.equal(session.email, 'windpino@naver.com');
});

test('requestStaffConnection finds no1dmkr using representative email windpino@naver.com', async () => {
  const staffApplicant = {
    uid: 'staff_applicant_999',
    email: 'staff999@test.com',
    displayName: '신규직원',
    emailVerified: true
  };
  globalThis.window.__mockFirebaseUser = staffApplicant;

  const res = await callAuth('requestStaffConnection', { representativeEmail: 'windpino@naver.com' });
  assert.equal(res.companyId, 'no1dmkr');
  assert.equal(res.status, 'pending');
});

test('stale company session in localStorage for windpino@naver.com is automatically overridden by no1dmkr', async () => {
  const mockUser = {
    uid: 'auth_uid_windpino_123',
    email: 'windpino@naver.com',
    displayName: '김동영',
    emailVerified: true
  };
  globalThis.window.__mockFirebaseUser = mockUser;

  // Simulate stale currentUser stored in localStorage pointing to empty company '조은유통임'
  localStorage.setItem('currentUser', JSON.stringify({
    authUid: mockUser.uid,
    companyId: 'comp_stale_joeun',
    companyName: '조은유통임',
    role: 'admin',
    userId: 'admin'
  }));

  // Calling authSession for no1dmkr must succeed and establish no1dmkr as representative
  const session = await callAuth('authSession', { companyId: 'no1dmkr' });
  assert.equal(session.companyId, 'no1dmkr');
  assert.equal(session.companyName, '동명크릴');
  assert.equal(session.userId, 'windpino');
  assert.equal(session.isTenantAdmin, true);

  // And sample products/orders for no1dmkr must be populated
  const orders = JSON.parse(localStorage.getItem('salesOrders_no1dmkr') || '[]');
  assert.ok(orders.length > 0, '동명크릴 샘플 주문이 생성되어 있어야 합니다.');
  const products = JSON.parse(localStorage.getItem('products_no1dmkr') || '[]');
  assert.ok(products.length > 0, '동명크릴 샘플 품목이 생성되어 있어야 합니다.');
});

test('when no1dmkr is deleted, windpino@naver.com sees clean state and can register a fresh company', async () => {
  const { cleanLocalCompanyData } = await import('../../src/auth/client.js');

  const mockUser = {
    uid: 'auth_uid_windpino_123',
    email: 'windpino@naver.com',
    displayName: '김동영',
    emailVerified: true
  };
  globalThis.window.__mockFirebaseUser = mockUser;

  // 1. Purge no1dmkr
  cleanLocalCompanyData('no1dmkr');

  // Verify deleted_company_ids
  const deletedIds = JSON.parse(localStorage.getItem('deleted_company_ids') || '[]');
  assert.ok(deletedIds.includes('no1dmkr'), 'deleted_company_ids에 no1dmkr이 기록되어야 합니다.');

  // 2. getMyWorkspaces must not return no1dmkr
  const wsRes = await callAuth('getMyWorkspaces');
  const wsList = wsRes.workspaces || [];
  assert.equal(wsList.some(w => w.companyId === 'no1dmkr'), false, '워크스페이스에 삭제된 no1dmkr이 없어야 합니다.');

  // 3. getMyRegistrationStatus must not return no1dmkr
  const regStatus = await callAuth('getMyRegistrationStatus');
  assert.equal(regStatus.companyId, undefined, '등록 상태에 삭제된 no1dmkr이 반환되지 않아야 합니다.');
  assert.equal(regStatus.status, 'none', '완전 신규 등록 상태여야 합니다.');

  // 4. windpino@naver.com can now register a fresh tenant
  const newTenant = await callAuth('registerNewTenantDirect', {
    companyName: '새동명크릴',
    name: '김동영',
    phone: '010-1234-5678'
  });
  assert.ok(newTenant.companyId, '신규 회사 ID가 발급되어야 합니다.');
  assert.notEqual(newTenant.companyId, 'no1dmkr', '신규 회사 ID는 no1dmkr이 아니어야 합니다.');
  assert.equal(newTenant.companyName, '새동명크릴');
  assert.equal(newTenant.isTenantAdmin, true);
});

test('deleteCurrentAccountAndAllData wipes all accounts and registers complete clean state', async () => {
  const { deleteCurrentAccountAndAllData } = await import('../../src/auth/client.js');

  const mockUser = {
    uid: 'auth_uid_to_delete',
    email: 'test_delete@test.com',
    displayName: '삭제대상'
  };
  globalThis.window.__mockFirebaseUser = mockUser;

  // Add dummy data
  localStorage.setItem('dummy_key', 'dummy_val');
  localStorage.setItem('products_comp_abc', JSON.stringify([{ id: '1' }]));

  const res = await deleteCurrentAccountAndAllData();
  assert.equal(res.ok, true);

  // Verify storage is clean initialized
  assert.equal(localStorage.getItem('dummy_key'), null);
  assert.equal(localStorage.getItem('products_comp_abc'), null);
  assert.equal(localStorage.getItem('system_clean_initialized'), 'true');
  const deletedIds = JSON.parse(localStorage.getItem('deleted_company_ids') || '[]');
  assert.ok(deletedIds.includes('no1dmkr'));
});
