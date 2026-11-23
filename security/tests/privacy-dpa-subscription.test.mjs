import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  PRIVACY_POLICY_VERSION, 
  DPA_VERSION, 
  SUBSCRIPTION_TERMS_VERSION,
  PRIVACY_POLICY_TEXT,
  DPA_TEXT,
  SUBSCRIPTION_TERMS_TEXT
} from '../../src/constants/legalDocuments.js';
import { hasCompanyDpaAgreed } from '../../src/utils/complianceUtils.js';

/**
 * 링커엑스 개인정보 처리방침, DPA 처리위탁, 유료 구독 계약 컴플라이언스 시뮬레이터
 */
class LinkerXComplianceSystem {
  constructor() {
    this.companies = new Map([
      ['no1dmkr', {
        id: 'no1dmkr',
        name: '동명크릴',
        status: 'active',
        hasExistingOperationalData: true
      }]
    ]);

    this.memberships = new Map([
      ['uid_ceo_dongmyeong_no1dmkr', { uid: 'uid_ceo_dongmyeong', companyId: 'no1dmkr', role: 'tenant_admin' }],
      ['uid_staff_dongmyeong_no1dmkr', { uid: 'uid_staff_dongmyeong', companyId: 'no1dmkr', role: 'tenant_staff' }]
    ]);

    this.dpaAgreements = new Map(); // key: companyId -> DPA record
    this.subscriptionAgreements = new Map(); // key: companyId -> Sub record
    this.partners = new Map([['no1dmkr', [{ id: 'p1', name: '남해낚시마트' }]]]);
    this.staff = new Map([['no1dmkr', [{ id: 's1', name: '김동명' }]]]);
  }

  // 1. 신규 회원사 가입 즉시 이용
  registerNewTenant(uid, email, companyData) {
    this.tenantSeq = (this.tenantSeq || 0) + 1;
    const companyId = `comp_${Date.now().toString(36)}_${this.tenantSeq}`;
    const newComp = {
      id: companyId,
      name: companyData.companyName,
      businessNo: companyData.businessNo,
      status: 'active',
      hasExistingOperationalData: false
    };
    this.companies.set(companyId, newComp);
    this.memberships.set(`${uid}_${companyId}`, {
      uid,
      companyId,
      role: 'tenant_admin',
      status: 'active'
    });
    this.partners.set(companyId, []);
    this.staff.set(companyId, []);
    return { companyId, status: 'active' };
  }

  // 2. 실제 데이터 등록 시도 전 DPA 검증
  verifyDpaBeforeDataRegistration(uid, companyId, actionType = '직원/거래처 등록') {
    const mem = this.memberships.get(`${uid}_${companyId}`);
    if (!mem) throw new Error('소속 회원이 아닙니다.');

    // 기존 데이터 보유 회사(동명크릴) 확인
    const comp = this.companies.get(companyId);
    const existingCount = (this.partners.get(companyId)?.length || 0) + (this.staff.get(companyId)?.length || 0);

    if (hasCompanyDpaAgreed(companyId, comp, existingCount)) {
      return { allowed: true, requiresDpa: false };
    }

    // 신규 회사이고 DPA 미체결인 경우
    const hasDpa = this.dpaAgreements.has(companyId);
    if (hasDpa) {
      return { allowed: true, requiresDpa: false };
    }

    // 미체결 상태에서 관리자가 요청한 경우: 합의 가능
    const isManager = mem.role === 'tenant_admin' || mem.role === 'admin';
    if (isManager) {
      return { 
        allowed: false, 
        requiresDpa: true, 
        screen: '실제 업무 데이터를 등록하기 전에',
        canAgree: true 
      };
    }

    // 미체결 상태에서 일반 직원이 요청한 경우: 차단 및 관리자 요청 안내
    return {
      allowed: false,
      requiresDpa: true,
      screen: '실제 업무 데이터를 등록하기 전에',
      canAgree: false,
      message: '회원사 관리자에게 데이터 등록 설정을 요청해 주세요'
    };
  }

  // 3. 관리자 개인정보 처리위탁(DPA) 동의 체결
  recordDpaAgreement(uid, companyId, { dpaVersion }) {
    const mem = this.memberships.get(`${uid}_${companyId}`);
    if (!mem || (mem.role !== 'tenant_admin' && mem.role !== 'admin')) {
      throw new Error('회사 관리자만 개인정보 처리위탁 합의에 동의할 수 있습니다.');
    }

    const record = {
      companyId,
      agreedByUid: uid,
      dpaVersion: dpaVersion || DPA_VERSION,
      agreedAt: new Date().toISOString(),
      status: 'active'
    };
    this.dpaAgreements.set(companyId, record);
    return { ok: true, record };
  }

  // 4. 유료 구독 계약 체결
  recordSubscriptionContract(uid, companyId, contractData) {
    const mem = this.memberships.get(`${uid}_${companyId}`);
    if (!mem || (mem.role !== 'tenant_admin' && mem.role !== 'admin')) {
      throw new Error('회사 관리자만 유료 구독 계약을 체결할 수 있습니다.');
    }

    if (!contractData.agreed) {
      throw new Error('유료 구독 계약 조건에 동의해야 합니다.');
    }

    const record = {
      companyId,
      agreedByUid: uid,
      contractVersion: contractData.contractVersion || SUBSCRIPTION_TERMS_VERSION,
      planName: contractData.planName,
      price: contractData.price,
      billingCycle: contractData.billingCycle,
      pricingSnapshot: contractData.pricingSnapshot,
      agreedAt: new Date().toISOString(),
      status: 'active'
    };
    this.subscriptionAgreements.set(companyId, record);
    return { ok: true, record };
  }

  // 5. 회사 간 데이터 분리 검증 (DPA나 유료 계약이 되어도 타사 데이터 접근 불가)
  accessPartnerData(requesterUid, targetCompanyId) {
    // 요청자의 소속 확인
    const isMember = this.memberships.has(`${requesterUid}_${targetCompanyId}`);
    if (!isMember) {
      throw new Error('다른 회원사의 데이터에 접근할 수 없습니다. (테넌트 격리)');
    }
    return this.partners.get(targetCompanyId) || [];
  }
}

// ──────────────────────────────────────────────────────────
// Node.js Test Suite
// ──────────────────────────────────────────────────────────

test('1. 신규 가입 즉시 작업공간 진입 및 개인정보 처리방침 안내', () => {
  const system = new LinkerXComplianceSystem();
  
  // 가입 시 처리방침 문서 버전 확인
  assert.equal(PRIVACY_POLICY_VERSION, 'v1.0-draft');
  assert.ok(PRIVACY_POLICY_TEXT.includes('계정 식별'));
  assert.ok(PRIVACY_POLICY_TEXT.includes('이용계약의 체결 및 이행'));

  const result = system.registerNewTenant('uid_user_1', 'user1@company.com', {
    companyName: '신규상사',
    businessNo: '111-22-33333'
  });

  assert.equal(result.status, 'active');
  assert.ok(result.companyId.startsWith('comp_'));
});

test('2. 실제 데이터 최초 등록 시 DPA 가드 발동 및 일반 직원 등록 제한', () => {
  const system = new LinkerXComplianceSystem();
  const comp = system.registerNewTenant('uid_ceo_abc', 'ceo@abc.com', {
    companyName: 'ABC유통',
    businessNo: '222-33-44444'
  });
  const cid = comp.companyId;

  // 일반 직원 추가
  system.memberships.set(`uid_staff_kim_${cid}`, {
    uid: 'uid_staff_kim',
    companyId: cid,
    role: 'tenant_staff'
  });

  // 일반 직원이 아직 DPA 미합의 상태인 회사에서 거래처 등록 시도
  const staffCheck = system.verifyDpaBeforeDataRegistration('uid_staff_kim', cid, '거래처 직접 등록');
  assert.equal(staffCheck.allowed, false);
  assert.equal(staffCheck.requiresDpa, true);
  assert.equal(staffCheck.canAgree, false, '일반 직원은 위탁 합의 권한 없음');
  assert.equal(staffCheck.message, '회원사 관리자에게 데이터 등록 설정을 요청해 주세요');

  // 관리자가 등록 시도 시: 합의 가능한 DPA 화면 표출
  const adminCheck = system.verifyDpaBeforeDataRegistration('uid_ceo_abc', cid, '거래처 직접 등록');
  assert.equal(adminCheck.allowed, false);
  assert.equal(adminCheck.requiresDpa, true);
  assert.equal(adminCheck.canAgree, true, '회사 관리자는 합의 가능');
  assert.equal(adminCheck.screen, '실제 업무 데이터를 등록하기 전에');
});

test('3. 회사 관리자의 DPA 합의 완료 -> 회사 ID/담당자/시각/버전 저장 및 일반 직원도 등록 계속 가능', () => {
  const system = new LinkerXComplianceSystem();
  const comp = system.registerNewTenant('uid_ceo_xyz', 'ceo@xyz.com', {
    companyName: 'XYZ물류',
    businessNo: '333-44-55555'
  });
  const cid = comp.companyId;

  system.memberships.set(`uid_staff_lee_${cid}`, {
    uid: 'uid_staff_lee',
    companyId: cid,
    role: 'tenant_staff'
  });

  // 관리자가 '동의하고 등록 계속' 클릭
  const agreeRes = system.recordDpaAgreement('uid_ceo_xyz', cid, {
    dpaVersion: DPA_VERSION
  });

  assert.equal(agreeRes.ok, true);
  assert.equal(agreeRes.record.companyId, cid);
  assert.equal(agreeRes.record.agreedByUid, 'uid_ceo_xyz');
  assert.equal(agreeRes.record.dpaVersion, 'v1.0-draft');
  assert.ok(agreeRes.record.agreedAt);

  // 합의 후에는 관리자뿐만 아니라 일반 직원도 추가 차단 없이 바로 등록 진행 가능
  const staffCheckAfter = system.verifyDpaBeforeDataRegistration('uid_staff_lee', cid, '거래처 엑셀 가져오기');
  assert.equal(staffCheckAfter.allowed, true);
  assert.equal(staffCheckAfter.requiresDpa, false);

  const adminCheckAfter = system.verifyDpaBeforeDataRegistration('uid_ceo_xyz', cid, '직원 직접 등록');
  assert.equal(adminCheckAfter.allowed, true);
  assert.equal(adminCheckAfter.requiresDpa, false);
});

test('4. 기존 운영 데이터를 이미 사용 중인 회원사(동명크릴)의 기존 업무 차단 방지', () => {
  const system = new LinkerXComplianceSystem();

  // no1dmkr(동명크릴)은 이미 운영 데이터를 사용 중이므로 기존 업무가 일괄 차단되지 않음
  const check = system.verifyDpaBeforeDataRegistration('uid_staff_dongmyeong', 'no1dmkr', '직원/거래처 등록');
  assert.equal(check.allowed, true);
  assert.equal(check.requiresDpa, false);
});

test('5. 유료 구독 계약 체결: 요금제 스냅샷 저장, 미정 항목 [확정 필요] 표기, 일반 직원 권한 차단', () => {
  const system = new LinkerXComplianceSystem();
  const comp = system.registerNewTenant('uid_ceo_pay', 'ceo@pay.com', {
    companyName: '페이상사',
    businessNo: '444-55-66666'
  });
  const cid = comp.companyId;

  system.memberships.set(`uid_staff_park_${cid}`, {
    uid: 'uid_staff_park',
    companyId: cid,
    role: 'tenant_staff'
  });

  // 1) 일반 직원이 유료 계약 시도 시 거부
  assert.throws(() => {
    system.recordSubscriptionContract('uid_staff_park', cid, {
      agreed: true,
      planName: '스탠다드 플랜 (1개월)',
      price: '33,000원'
    });
  }, /회사 관리자만 유료 구독 계약을 체결할 수 있습니다/);

  // 2) 관리자가 동의 체크 없이 결제 시도 시 거부
  assert.throws(() => {
    system.recordSubscriptionContract('uid_ceo_pay', cid, {
      agreed: false,
      planName: '스탠다드 플랜 (1개월)',
      price: '33,000원'
    });
  }, /유료 구독 계약 조건에 동의해야 합니다/);

  // 3) 관리자가 동의 후 계약 체결 성공
  const subRes = system.recordSubscriptionContract('uid_ceo_pay', cid, {
    agreed: true,
    planName: '스탠다드 플랜 (1개월)',
    price: '33,000원',
    billingCycle: '월간 결제',
    pricingSnapshot: {
      planName: '스탠다드 플랜 (1개월)',
      price: '33,000원',
      refundCondition: '7일 이내 전액 환불 (확정 필요)',
      dataRetention: '30일 백업 내보내기 후 영구 삭제 (확정 필요)'
    }
  });

  assert.equal(subRes.ok, true);
  assert.equal(subRes.record.contractVersion, 'v1.0-draft');
  assert.equal(subRes.record.pricingSnapshot.refundCondition, '7일 이내 전액 환불 (확정 필요)');
  assert.equal(subRes.record.pricingSnapshot.dataRetention, '30일 백업 내보내기 후 영구 삭제 (확정 필요)');
});

test('6. 회사 간 데이터 분리 및 테넌트 격리: DPA나 유료 계약이 완료되어도 타 회원사 데이터 접근 원천 차단', () => {
  const system = new LinkerXComplianceSystem();
  
  const compA = system.registerNewTenant('uid_ceo_a', 'ceo@a.com', { companyName: 'A사', businessNo: '111-11-11111' });
  const compB = system.registerNewTenant('uid_ceo_b', 'ceo@b.com', { companyName: 'B사', businessNo: '222-22-22222' });

  // A사가 DPA 및 유료 계약을 체결함
  system.recordDpaAgreement('uid_ceo_a', compA.companyId, { dpaVersion: DPA_VERSION });
  system.recordSubscriptionContract('uid_ceo_a', compA.companyId, {
    agreed: true,
    planName: '연간 플랜',
    price: '330,000원'
  });

  // A사의 관리자가 B사의 거래처 데이터를 조회하려고 시도할 때 원천 차단
  assert.throws(() => {
    system.accessPartnerData('uid_ceo_a', compB.companyId);
  }, /다른 회원사의 데이터에 접근할 수 없습니다/);

  // B사의 관리자가 A사의 거래처 데이터를 조회하려고 시도할 때도 원천 차단
  assert.throws(() => {
    system.accessPartnerData('uid_ceo_b', compA.companyId);
  }, /다른 회원사의 데이터에 접근할 수 없습니다/);
});
