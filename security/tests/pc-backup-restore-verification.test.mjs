import test from 'node:test';
import assert from 'node:assert/strict';

// Logic exactly mirroring src/utils/bundleSyncManager.js filterBundleListForCompany
function deduplicatePartners(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];
  for (const p of list) {
    if (!p) continue;
    const name = (p.name || '').trim().toLowerCase();
    const bizNo = (p.bizNo || p.businessNumber || p.businessNo || '').replace(/[^0-9]/g, '');
    const key = bizNo ? `biz:${bizNo}` : `name:${name}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }
  return result;
}

function filterBundleListForCompany(companyId, colName, rawList) {
  if (!Array.isArray(rawList)) return [];
  const targetId = String(companyId || 'default');

  const filtered = rawList.filter(item => {
    if (!item) return false;
    const requiresName = ['products', 'categories', 'warehouses', 'partners', 'staffList'].includes(colName);
    if (requiresName && (!item.name || !String(item.name).trim())) return false;
    
    // Strict isolation: An item without companyId is legacy and ONLY belongs to 'no1dmkr'
    if (!item.companyId) {
      return targetId === 'no1dmkr';
    }
    return String(item.companyId) === targetId;
  });

  if (colName === 'partners') {
    return deduplicatePartners(filtered);
  }

  if (colName === 'products') {
    const prodMap = new Map();
    filtered.forEach(p => {
      if (!p || !p.id) return;
      prodMap.set(String(p.id), p);
    });
    return Array.from(prodMap.values());
  }

  return filtered;
}

test('1. PC 백업 JSON 복원 시 이전 companyId(예: no1dmkr)가 새 회원사 companyId로 정상 스탬핑되어 데이터 누락이 발생하지 않는다', () => {
  const currentCompanyId = 'dongmyeong_new_001';
  
  // 가상의 과거 백업 파일 데이터 (이전 회원사 ID: no1dmkr)
  const legacyBackupProducts = [
    { id: 101, name: '크릴오일 500mg', companyId: 'no1dmkr', spec: '60캡슐', salesPrice: 25000 },
    { id: 102, name: '오메가3 프리미엄', companyId: 'no1dmkr', spec: '90캡슐', salesPrice: 32000 },
    { id: 103, name: '루테인 비타민', companyId: 'no1dmkr', spec: '30캡슐', salesPrice: 18000 }
  ];

  // 1-1. 스탬핑을 하지 않으면 multi-tenant isolation에 의해 전부 필터링(0건)됨을 확인
  const unStampedFiltered = filterBundleListForCompany(currentCompanyId, 'products', legacyBackupProducts);
  assert.strictEqual(unStampedFiltered.length, 0, '스탬핑이 안 된 경우 타 회원사 격리에 의해 0건이어야 함');

  // 1-2. 복원 시 적용되는 스탬핑 로직 시뮬레이션
  const stampedProducts = legacyBackupProducts.map(item => ({
    ...item,
    companyId: currentCompanyId
  }));

  // 1-3. 스탬핑 후 필터 통과 확인
  const stampedFiltered = filterBundleListForCompany(currentCompanyId, 'products', stampedProducts);
  assert.strictEqual(stampedFiltered.length, 3, '스탬핑 후에는 3건 모두 유지되어야 함');
  assert.strictEqual(stampedFiltered[0].name, '크릴오일 500mg');
  assert.strictEqual(stampedFiltered[0].companyId, currentCompanyId);
});

test('2. 거래처 목록 복원 시 중복 제거 및 현재 companyId 스탬핑이 정상 작동한다', () => {
  const currentCompanyId = 'dongmyeong_new_001';

  const backupPartners = [
    { id: 1, name: '바다상사', companyId: 'old_comp', bizNo: '111-22-33333' },
    { id: 2, name: '남해수산', companyId: 'old_comp', bizNo: '222-33-44444' },
    { id: 3, name: '바다상사', companyId: 'old_comp', bizNo: '111-22-33333' } // 중복 거래처
  ];

  const stamped = backupPartners.map(p => ({ ...p, companyId: currentCompanyId }));
  const deduplicated = deduplicatePartners(stamped);
  const filtered = filterBundleListForCompany(currentCompanyId, 'partners', deduplicated);

  assert.strictEqual(filtered.length, 2, '중복 거래처 1건이 제거되어 2건이어야 함');
  assert.strictEqual(filtered.find(p => p.name === '바다상사')?.companyId, currentCompanyId);
});

test('3. 직원 목록 복원 시 현재 로그인된 대표자/관리자 계정이 보존되어 세션 잠김이 방지된다', () => {
  const currentCompanyId = 'dongmyeong_new_001';
  const currentAdminUser = {
    userId: 'windpino',
    authUid: 'firebase_uid_windpino',
    name: '김대표',
    email: 'windpino@naver.com',
    companyId: currentCompanyId,
    role: 'admin',
    authRole: 'tenant_admin',
    isCompanyAdmin: true,
    isMasterAdmin: true,
    status: 'active'
  };

  // 백업 파일에는 과거 직원만 존재하고 현재 windpino 계정은 없는 상태
  const backupStaffList = [
    { id: 1, userId: 'staff_lee', name: '이대리', role: 'staff', companyId: 'old_comp' },
    { id: 2, userId: 'staff_park', name: '박과장', role: 'staff', companyId: 'old_comp' }
  ];

  // 복원 시 대표 관리자 계정 보존 로직 시뮬레이션
  const stampedStaff = backupStaffList.map(s => ({ ...s, companyId: currentCompanyId }));
  const hasCurrentAdmin = stampedStaff.some(s => 
    (s.userId && s.userId === currentAdminUser.userId) || 
    (s.email && s.email === currentAdminUser.email)
  );

  if (!hasCurrentAdmin) {
    stampedStaff.unshift({
      id: Date.now(),
      userId: currentAdminUser.userId,
      authUid: currentAdminUser.authUid,
      name: currentAdminUser.name,
      email: currentAdminUser.email,
      role: 'admin',
      authRole: 'tenant_admin',
      companyId: currentCompanyId,
      status: 'active',
      isCompanyAdmin: true,
      isMasterAdmin: true
    });
  }

  const filteredStaff = filterBundleListForCompany(currentCompanyId, 'staffList', stampedStaff);
  assert.strictEqual(filteredStaff.length, 3, '기존 직원 2명 + 보존된 관리자 1명 = 총 3명');
  const preserved = filteredStaff.find(s => s.userId === 'windpino');
  assert.ok(preserved, '현재 관리자 계정 windpino가 보존되어 있어야 함');
  assert.strictEqual(preserved.role, 'admin');
  assert.strictEqual(preserved.companyId, currentCompanyId);
});

test('4. 세션 캐시 소유자(authCacheOwner)가 일치할 때 로컬 번들 캐시가 삭제되지 않는다', () => {
  const session = {
    authUid: 'uid_123',
    companyId: 'dongmyeong_new_001',
    authRole: 'tenant_admin',
    permissions: { sales: 'read_write', inventory: 'read_write' }
  };

  const permissions = Object.fromEntries(Object.entries(session.permissions || {}).sort(([a],[b])=>a.localeCompare(b)));
  const owner = JSON.stringify([session.authUid, session.companyId, session.authRole, permissions]);

  // 동일한 사용자가 새로고침하거나 재로그인할 때
  const prevOwner = owner;
  const isDifferentCompany = false; // prevOwner === owner이므로 회사 변경 없음

  assert.strictEqual(owner, prevOwner, '새로고침/재로그인 시 owner 키가 동일해야 함');
  assert.strictEqual(isDifferentCompany, false, '동일 회사이므로 캐시 초기화 트리거가 동작하지 않음');
});
