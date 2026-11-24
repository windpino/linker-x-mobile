import test from 'node:test';
import assert from 'node:assert/strict';

// Helper replicating SettingsManager company resolution logic
function resolveSettingsCompany(initialSettings = {}, companySettings = null, currentUser = null) {
  const initial = { ...initialSettings };
  if (!initial.company) initial.company = {};

  const autoName = companySettings?.name || companySettings?.companyName || currentUser?.companyName || currentUser?.company || '';
  const autoBizNum = companySettings?.businessNo || companySettings?.bizNum || companySettings?.businessNumber || companySettings?.bno || currentUser?.businessNo || currentUser?.bizNum || '';
  const autoCeo = companySettings?.ceo || companySettings?.representative || companySettings?.manager || currentUser?.name || currentUser?.ceo || '';
  const autoAddress = companySettings?.address || companySettings?.addr || '';
  const autoTel = companySettings?.phone || companySettings?.managerContact || companySettings?.tel || companySettings?.contact || currentUser?.phone || currentUser?.tel || '';
  const autoEmail = companySettings?.email || currentUser?.email || '';
  const autoType = companySettings?.type || companySettings?.businessType || '';

  initial.company.name = initial.company.name || autoName;
  initial.company.bizNum = initial.company.bizNum || autoBizNum;
  initial.company.ceo = initial.company.ceo || autoCeo;
  initial.company.address = initial.company.address || autoAddress;
  initial.company.tel = initial.company.tel || autoTel;
  initial.company.email = initial.company.email || autoEmail;
  initial.company.type = initial.company.type || autoType;

  return initial.company;
}

// Helper replicating useEffect async update when companySettings loads after mount
function applyAsyncCompanySettings(prevCompany = {}, companySettings = null, currentUser = null) {
  const currentComp = { ...prevCompany };
  const autoName = companySettings?.name || companySettings?.companyName || currentUser?.companyName || currentUser?.company || '';
  const autoBizNum = companySettings?.businessNo || companySettings?.bizNum || companySettings?.businessNumber || companySettings?.bno || currentUser?.businessNo || currentUser?.bizNum || '';
  const autoCeo = companySettings?.ceo || companySettings?.representative || companySettings?.manager || currentUser?.name || currentUser?.ceo || '';
  const autoAddress = companySettings?.address || companySettings?.addr || '';
  const autoTel = companySettings?.phone || companySettings?.managerContact || companySettings?.tel || companySettings?.contact || currentUser?.phone || currentUser?.tel || '';
  const autoEmail = companySettings?.email || currentUser?.email || '';
  const autoType = companySettings?.type || companySettings?.businessType || '';

  let changed = false;
  const nextComp = { ...currentComp };

  if (!nextComp.name && autoName) { nextComp.name = autoName; changed = true; }
  if (!nextComp.bizNum && autoBizNum) { nextComp.bizNum = autoBizNum; changed = true; }
  if (!nextComp.ceo && autoCeo) { nextComp.ceo = autoCeo; changed = true; }
  if (!nextComp.address && autoAddress) { nextComp.address = autoAddress; changed = true; }
  if (!nextComp.tel && autoTel) { nextComp.tel = autoTel; changed = true; }
  if (!nextComp.email && autoEmail) { nextComp.email = autoEmail; changed = true; }
  if (!nextComp.type && autoType) { nextComp.type = autoType; changed = true; }

  return { company: nextComp, changed };
}

test('1. 회원사 가입 시 입력한 회사명, 사업자번호, 대표자명, 연락처가 설정창에 자동으로 입력된다', () => {
  const registeredCompany = {
    id: 'comp_test_001',
    name: '주식회사 링커로지스',
    businessNo: '123-45-67890',
    ceo: '홍길동',
    managerContact: '010-1234-5678',
    email: 'ceo@linker-logis.com'
  };

  const currentUser = {
    companyId: 'comp_test_001',
    companyName: '주식회사 링커로지스',
    name: '홍길동',
    phone: '010-1234-5678',
    email: 'ceo@linker-logis.com',
    role: 'admin'
  };

  const resolved = resolveSettingsCompany({}, registeredCompany, currentUser);

  assert.strictEqual(resolved.name, '주식회사 링커로지스');
  assert.strictEqual(resolved.bizNum, '123-45-67890');
  assert.strictEqual(resolved.ceo, '홍길동');
  assert.strictEqual(resolved.tel, '010-1234-5678');
  assert.strictEqual(resolved.email, 'ceo@linker-logis.com');
});

test('2. companySettings 비동기 로딩 지연 시에도 useEffect를 통해 빈 설정창에 자동 채워진다', () => {
  // 초기 렌더링 시점에 companySettings가 아직 null인 상태
  const initialComp = resolveSettingsCompany({}, null, null);
  assert.strictEqual(initialComp.name, '');
  assert.strictEqual(initialComp.bizNum, '');

  // 0.3초 후 Firebase에서 회사 정보 도착
  const asyncLoadedCompany = {
    companyName: '테스트물류(주)',
    bizNum: '987-65-43210',
    representative: '김대표',
    phone: '02-123-4567',
    email: 'admin@testlogis.co.kr'
  };

  const result = applyAsyncCompanySettings(initialComp, asyncLoadedCompany, null);
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.company.name, '테스트물류(주)');
  assert.strictEqual(result.company.bizNum, '987-65-43210');
  assert.strictEqual(result.company.ceo, '김대표');
  assert.strictEqual(result.company.tel, '02-123-4567');
  assert.strictEqual(result.company.email, 'admin@testlogis.co.kr');
});

test('3. 이미 사용자가 수정한 주소나 정보가 있다면 기존 입력값을 덮어쓰지 않고 보존한다', () => {
  const existingCustom = {
    name: '커스텀상호명',
    bizNum: '111-22-33333',
    address: '서울특별시 강남구 테헤란로 123'
  };

  const asyncCompany = {
    name: '원래상호명',
    bizNum: '999-99-99999',
    ceo: '새대표',
    email: 'new@linker.com'
  };

  const result = applyAsyncCompanySettings(existingCustom, asyncCompany, null);
  // 기존에 있던 name, bizNum, address는 보존되고 비어있던 ceo, email만 채워짐
  assert.strictEqual(result.company.name, '커스텀상호명');
  assert.strictEqual(result.company.bizNum, '111-22-33333');
  assert.strictEqual(result.company.address, '서울특별시 강남구 테헤란로 123');
  assert.strictEqual(result.company.ceo, '새대표');
  assert.strictEqual(result.company.email, 'new@linker.com');
});

test('4. 필드명 별칭(businessNo/bizNum/bno, managerContact/phone/tel) 모두 유연하게 인식한다', () => {
  const formatA = { businessNo: '111-00-11111', managerContact: '010-0000-1111' };
  const resA = resolveSettingsCompany({}, formatA, null);
  assert.strictEqual(resA.bizNum, '111-00-11111');
  assert.strictEqual(resA.tel, '010-0000-1111');

  const formatB = { bno: '222-00-22222', contact: '010-0000-2222' };
  const resB = resolveSettingsCompany({}, formatB, null);
  assert.strictEqual(resB.bizNum, '222-00-22222');
  assert.strictEqual(resB.tel, '010-0000-2222');

  const formatC = { businessNumber: '333-00-33333', tel: '010-0000-3333' };
  const resC = resolveSettingsCompany({}, formatC, null);
  assert.strictEqual(resC.bizNum, '333-00-33333');
  assert.strictEqual(resC.tel, '010-0000-3333');
});
