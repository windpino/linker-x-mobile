import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanLocalCompanyData } from '../../src/auth/client.js';

// Setup mock window and localStorage
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

test('cleanLocalCompanyData properly wipes company data across all registries and collections', () => {
  const cid = 'comp_test123';

  // Seed sample company data
  localStorage.setItem(`products_${cid}`, JSON.stringify([{ id: 'p1' }]));
  localStorage.setItem(`partners_${cid}`, JSON.stringify([{ id: 'part1' }]));
  localStorage.setItem(`staffList_${cid}`, JSON.stringify([{ id: 'staff1' }]));
  localStorage.setItem(`bundle_products_${cid}`, '[]');
  localStorage.setItem(`warehouses_${cid}`, '[]');
  localStorage.setItem('products_other_comp', JSON.stringify([{ id: 'other' }]));

  localStorage.setItem('dev_companies', JSON.stringify([
    { id: cid, name: '테스트회사' },
    { id: 'no1dmkr', name: '동명크릴' }
  ]));

  localStorage.setItem('dev_workspaces', JSON.stringify([
    { id: cid, name: '테스트회사' },
    { id: 'no1dmkr', name: '동명크릴' }
  ]));

  localStorage.setItem('dev_memberships', JSON.stringify({
    [`user1_${cid}`]: { uid: 'user1', companyId: cid },
    [`user2_no1dmkr`]: { uid: 'user2', companyId: 'no1dmkr' }
  }));

  localStorage.setItem('dev_membership_requests', JSON.stringify([
    { uid: 'user3', companyId: cid },
    { uid: 'user4', companyId: 'no1dmkr' }
  ]));

  localStorage.setItem('agencies', JSON.stringify([
    { id: cid, name: '테스트회사' },
    { id: 'no1dmkr', name: '동명크릴' }
  ]));

  // Execute wipe
  cleanLocalCompanyData(cid);

  // Assertions
  assert.equal(localStorage.getItem(`products_${cid}`), null);
  assert.equal(localStorage.getItem(`partners_${cid}`), null);
  assert.equal(localStorage.getItem(`staffList_${cid}`), null);
  assert.equal(localStorage.getItem(`bundle_products_${cid}`), null);
  assert.equal(localStorage.getItem(`warehouses_${cid}`), null);

  // Other company data should remain untouched
  assert.notEqual(localStorage.getItem('products_other_comp'), null);

  const remainingCompanies = JSON.parse(localStorage.getItem('dev_companies'));
  assert.equal(remainingCompanies.length, 1);
  assert.equal(remainingCompanies[0].id, 'no1dmkr');

  const remainingWorkspaces = JSON.parse(localStorage.getItem('dev_workspaces'));
  assert.equal(remainingWorkspaces.length, 1);
  assert.equal(remainingWorkspaces[0].id, 'no1dmkr');

  const remainingMemberships = JSON.parse(localStorage.getItem('dev_memberships'));
  assert.equal(Object.keys(remainingMemberships).length, 1);
  assert.equal(remainingMemberships[`user1_${cid}`], undefined);
  assert.notEqual(remainingMemberships[`user2_no1dmkr`], undefined);

  const remainingRequests = JSON.parse(localStorage.getItem('dev_membership_requests'));
  assert.equal(remainingRequests.length, 1);
  assert.equal(remainingRequests[0].companyId, 'no1dmkr');

  const remainingAgencies = JSON.parse(localStorage.getItem('agencies'));
  assert.equal(remainingAgencies.length, 1);
  assert.equal(remainingAgencies[0].id, 'no1dmkr');

  const deletedIds = JSON.parse(localStorage.getItem('deleted_company_ids'));
  assert.ok(deletedIds.includes(cid));
});

test('cleanLocalCompanyData for no1dmkr marks it deleted and prevents auto-resurrection', async () => {
  const { initDongmyeongSampleData } = await import('../../src/auth/client.js');
  
  // Wipe no1dmkr
  cleanLocalCompanyData('no1dmkr');

  const deletedIds = JSON.parse(localStorage.getItem('deleted_company_ids'));
  assert.ok(deletedIds.includes('no1dmkr'));

  // Attempting to run initDongmyeongSampleData should now be a no-op
  initDongmyeongSampleData('rep_test', 'windpino@naver.com');
  const storedCompanies = JSON.parse(localStorage.getItem('dev_companies') || '[]');
  assert.ok(!storedCompanies.some(c => c.id === 'no1dmkr'));
});
