import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * 링커엑스 회원사 가입 및 직원·거래처 초대 / 회원사 링커 연결 검증 시스템
 */
class LinkerXTenantSystem {
  constructor() {
    // 기존 활성 회원사 (동명크릴)
    this.companies = new Map([
      ['no1dmkr', {
        id: 'no1dmkr',
        name: '동명크릴',
        businessNo: '617-81-12345',
        ceo: '김동영',
        status: 'active',
        trialStartedAt: '2026-01-01T00:00:00.000Z',
        trialEndsAt: '2026-01-31T23:59:59.999Z',
        createdAt: '2026-01-01T00:00:00.000Z'
      }]
    ]);

    this.memberships = new Map(); // key: `${uid}_${companyId}`
    this.staffList = new Map(); // key: companyId -> array of staff
    this.warehouses = new Map(); // key: companyId -> array of warehouses
    this.invitations = new Map(); // key: inviteId
    this.companyLinks = new Map(); // key: linkId
    this.partners = new Map(); // key: companyId -> array of partners
    this.salesOrders = new Map(); // key: companyId -> array of salesOrders
    this.salesInvoices = new Map(); // key: companyId -> array of invoices
    this.inventory = new Map(); // key: companyId -> object

    // 동명크릴 초기 데이터 설정
    this.memberships.set('uid_ceo_dongmyeong_no1dmkr', {
      uid: 'uid_ceo_dongmyeong',
      companyId: 'no1dmkr',
      companyName: '동명크릴',
      role: 'tenant_admin',
      status: 'active'
    });

    this.partners.set('no1dmkr', [
      { id: 'part_namhae', name: '남해낚시마트', ceo: '박남해', phone: '055-867-0001', email: 'namhae@fish.kr', linkedCompanyId: null },
      { id: 'part_yeosu', name: '여수레저', ceo: '이여수', phone: '061-662-0002', email: 'yeosu@fish.kr', linkedCompanyId: null }
    ]);

    this.salesOrders.set('no1dmkr', [
      { id: 'SO-001', companyId: 'no1dmkr', partnerId: 'part_namhae', partnerName: '남해낚시마트', totalAmount: 350000, status: '접수' }
    ]);

    this.salesInvoices.set('no1dmkr', [
      { id: 'INV-001', companyId: 'no1dmkr', partnerId: 'part_namhae', partnerName: '남해낚시마트', totalAmount: 350000, date: '2026-11-20' }
    ]);

    this.inventory.set('no1dmkr', {
      costPrice: { '크릴새우 1kg': 3200, '제주 각크릴': 4100 },
      stock: { '크릴새우 1kg': 2400, '제주 각크릴': 1800 }
    });
  }

  // 1. 신규 회원사 가입 즉시 이용 (승인 대기 X, 희망 회사 ID 입력란 X, 30일 무료 체험)
  registerNewTenantDirect(uid, email, { companyName, businessNo, ceoName, phone }) {
    if (!companyName || !businessNo || !ceoName || !phone) {
      throw new Error('필수 정보가 누락되었습니다.');
    }

    const cleanBizNo = businessNo.replace(/[^0-9]/g, '');

    // 기존 동명크릴 같은 회원사와의 사업자번호 일치 시 자동 승인 금지 (슈퍼관리자 직접 연결 절차 유지)
    for (const [cid, comp] of this.companies.entries()) {
      if (comp.businessNo.replace(/[^0-9]/g, '') === cleanBizNo) {
        if (cid === 'no1dmkr') {
          throw new Error('기존 등록된 회원사입니다. 슈퍼관리자 자격 확인 후 연결을 진행해 주세요.');
        }
        // 동일 회사 중복 신청 시 기존 발급 ID와 최초 체험 기간 유지 (체험 기간 리셋 방지)
        return {
          ok: true,
          companyId: cid,
          companyName: comp.name,
          trialEndsAt: comp.trialEndsAt,
          isDuplicateSubmission: true
        };
      }
    }

    // 신규 내부 회사 ID 자동 발급 (사용자가 ID를 입력하지 않음)
    const companyId = `comp_${cleanBizNo.slice(-6)}_${Date.now().toString(36)}`;
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const newCompany = {
      id: companyId,
      name: companyName,
      businessNo,
      ceo: ceoName,
      phone,
      status: 'active',
      trialStartedAt: now.toISOString(),
      trialEndsAt: trialEnds.toISOString(),
      createdAt: now.toISOString()
    };
    this.companies.set(companyId, newCompany);

    // 대표자에게 즉시 관리자 권한 부여
    this.memberships.set(`${uid}_${companyId}`, {
      uid,
      companyId,
      companyName,
      role: 'tenant_admin',
      status: 'active',
      permissions: { all: true }
    });

    // 격리 데이터 초기화
    this.partners.set(companyId, []);
    this.salesOrders.set(companyId, []);
    this.salesInvoices.set(companyId, []);
    this.inventory.set(companyId, { costPrice: {}, stock: {} });

    // 기본 창고 자동 생성 ('기본 창고')
    const defaultWH = {
      id: 'wh_default',
      name: '기본 창고',
      code: 'WH01',
      isMain: true,
      companyId,
      manager: ceoName,
      phone
    };
    this.warehouses.set(companyId, [defaultWH]);

    // 대표 계정 자동 생성 (직원 관리 - 대표 아이디 및 기본 정보)
    const repUserId = email.includes('@') ? email.split('@')[0] : 'admin';
    const repStaff = {
      id: uid,
      userId: repUserId,
      name: ceoName,
      phone,
      email,
      role: 'admin',
      jobTitle: '대표',
      warehouse: '기본 창고',
      isCompanyAdmin: true,
      accountStatus: 'linked',
      linkedUid: uid,
      linkedEmail: email
    };
    this.staffList.set(companyId, [repStaff]);

    return {
      ok: true,
      companyId,
      companyName,
      trialEndsAt: newCompany.trialEndsAt,
      isDuplicateSubmission: false
    };
  }

  // 2. 회사 설정 -> 구성원 관리 -> 직원 초대
  createStaffInvitation(adminUid, companyId, { targetEmail, staffName, phone, staffId, permissions }) {
    const adminMem = this.memberships.get(`${adminUid}_${companyId}`);
    if (!adminMem || adminMem.role !== 'tenant_admin') {
      throw new Error('회사 관리자만 직원을 초대할 수 있습니다.');
    }

    const invId = `inv_staff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const invitation = {
      id: invId,
      type: 'staff',
      companyId,
      companyName: this.companies.get(companyId)?.name,
      targetEmail: targetEmail.toLowerCase().trim(),
      staffName,
      phone,
      staffId: staffId || `staff_${Date.now()}`,
      permissions: permissions || { orders: true, loading: true },
      invitedBy: adminUid,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.invitations.set(invId, invitation);
    return invitation;
  }

  // 3. 거래처 관리 -> 거래처 선택 -> 주문 초대
  createPartnerInvitation(adminUid, companyId, { partnerId, targetEmail, contactName, phone }) {
    const adminMem = this.memberships.get(`${adminUid}_${companyId}`);
    if (!adminMem || adminMem.role !== 'tenant_admin') {
      throw new Error('회사 관리자만 거래처 주문 초대를 보낼 수 있습니다.');
    }

    const companyPartners = this.partners.get(companyId) || [];
    const targetPartner = companyPartners.find(p => p.id === partnerId);
    if (!targetPartner) {
      throw new Error('존재하지 않는 거래처입니다.');
    }

    const invId = `inv_partner_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const invitation = {
      id: invId,
      type: 'partner_order',
      companyId,
      companyName: this.companies.get(companyId)?.name,
      partnerId,
      partnerName: targetPartner.name,
      targetEmail: targetEmail.toLowerCase().trim(),
      contactName,
      phone,
      invitedBy: adminUid,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.invitations.set(invId, invitation);
    return invitation;
  }

  // 4. 개인 계정 로그인 상태에서 초대 수락 (직원 또는 거래처 주문)
  acceptInvitation(userUid, userEmail, invitationId) {
    const inv = this.invitations.get(invitationId);
    if (!inv || inv.status !== 'pending') {
      throw new Error('유효하지 않거나 이미 처리된 초대입니다.');
    }
    if (inv.targetEmail !== userEmail.toLowerCase().trim()) {
      throw new Error('초대 대상 이메일 계정으로 로그인해야 수락할 수 있습니다.');
    }

    if (inv.type === 'staff') {
      this.memberships.set(`${userUid}_${inv.companyId}`, {
        uid: userUid,
        companyId: inv.companyId,
        companyName: inv.companyName,
        legacyId: inv.staffId,
        role: 'tenant_staff',
        status: 'active',
        permissions: inv.permissions,
        approvedAt: new Date().toISOString()
      });
    } else if (inv.type === 'partner_order') {
      this.memberships.set(`${userUid}_${inv.companyId}`, {
        uid: userUid,
        companyId: inv.companyId,
        companyName: inv.companyName,
        partnerId: inv.partnerId,
        partnerName: inv.partnerName,
        role: 'partner',
        status: 'active',
        permissions: { orders: true, viewInvoices: true },
        approvedAt: new Date().toISOString()
      });
    }

    inv.status = 'accepted';
    inv.acceptedBy = userUid;
    inv.acceptedAt = new Date().toISOString();

    return { ok: true, companyId: inv.companyId, role: inv.type === 'staff' ? 'tenant_staff' : 'partner' };
  }

  // 5. 거래처 관리 -> 회원사 연결 (B2B 연동 요청 및 수락)
  requestCompanyLink(adminUid, fromCompanyId, toCompanyId, partnerIdInFromCompany) {
    const adminMem = this.memberships.get(`${adminUid}_${fromCompanyId}`);
    if (!adminMem || adminMem.role !== 'tenant_admin') {
      throw new Error('관리자만 회원사 연결을 요청할 수 있습니다.');
    }
    if (!this.companies.has(toCompanyId)) {
      throw new Error('상대 회원사를 찾을 수 없습니다.');
    }

    const linkId = `link_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const link = {
      id: linkId,
      fromCompanyId,
      fromCompanyName: this.companies.get(fromCompanyId)?.name,
      toCompanyId,
      toCompanyName: this.companies.get(toCompanyId)?.name,
      partnerId: partnerIdInFromCompany,
      status: 'pending',
      requestedBy: adminUid,
      createdAt: new Date().toISOString()
    };
    this.companyLinks.set(linkId, link);
    return link;
  }

  acceptCompanyLink(adminUid, toCompanyId, linkId, matchingPartnerIdInToCompany) {
    const adminMem = this.memberships.get(`${adminUid}_${toCompanyId}`);
    if (!adminMem || adminMem.role !== 'tenant_admin') {
      throw new Error('관리자만 회원사 연결을 수락할 수 있습니다.');
    }

    const link = this.companyLinks.get(linkId);
    if (!link || link.toCompanyId !== toCompanyId || link.status !== 'pending') {
      throw new Error('유효하지 않은 연결 요청입니다.');
    }

    // 양사 거래처 기록에 상대 회원사 ID 연결
    const fromPartners = this.partners.get(link.fromCompanyId) || [];
    const pFrom = fromPartners.find(p => p.id === link.partnerId);
    if (pFrom) {
      pFrom.linkedCompanyId = link.toCompanyId;
    }

    const toPartners = this.partners.get(link.toCompanyId) || [];
    const pTo = toPartners.find(p => p.id === matchingPartnerIdInToCompany);
    if (pTo) {
      pTo.linkedCompanyId = link.fromCompanyId;
    }

    link.status = 'accepted';
    link.acceptedBy = adminUid;
    link.acceptedAt = new Date().toISOString();
    return { ok: true, status: 'accepted' };
  }

  // 6. 거래처 전용 주문 생성
  createPartnerOrder(partnerUid, companyId, orderItems, memo) {
    const mem = this.memberships.get(`${partnerUid}_${companyId}`);
    if (!mem || mem.role !== 'partner' || !mem.partnerId) {
      throw new Error('거래처 주문 권한이 없습니다.');
    }

    const orderId = `PO-ORD-${Date.now()}`;
    const totalAmount = orderItems.reduce((sum, item) => sum + (item.qty * item.price), 0);

    const newOrder = {
      id: orderId,
      companyId,
      partnerId: mem.partnerId,
      partnerName: mem.partnerName,
      items: orderItems,
      totalAmount,
      memo,
      status: '접수대기',
      orderedByUid: partnerUid,
      createdAt: new Date().toISOString()
    };

    const orders = this.salesOrders.get(companyId) || [];
    orders.push(newOrder);
    this.salesOrders.set(companyId, orders);
    return newOrder;
  }

  // 7. 데이터 접근 제어 및 격리 조회
  getPartnerViewData(partnerUid, companyId) {
    const mem = this.memberships.get(`${partnerUid}_${companyId}`);
    if (!mem || mem.role !== 'partner') {
      throw new Error('접근 권한이 없습니다.');
    }

    // 거래처는 오직 자기 매장의 주문/배송 및 전표만 조회 가능
    const allOrders = this.salesOrders.get(companyId) || [];
    const partnerOrders = allOrders.filter(o => o.partnerId === mem.partnerId);

    const allInvoices = this.salesInvoices.get(companyId) || [];
    const partnerInvoices = allInvoices.filter(i => i.partnerId === mem.partnerId);

    return {
      partnerId: mem.partnerId,
      orders: partnerOrders,
      invoices: partnerInvoices,
      // 내부 재고/원가는 원천 차단
      internalCostPrice: undefined,
      internalInventory: undefined
    };
  }

  // 8. 사용자 소속 및 워크스페이스 조회
  getUserWorkspaces(uid, email) {
    const workspaces = [];
    for (const [key, mem] of this.memberships.entries()) {
      if (mem.uid === uid && mem.status === 'active') {
        workspaces.push({
          companyId: mem.companyId,
          companyName: mem.companyName,
          role: mem.role,
          partnerId: mem.partnerId || null,
          type: mem.role === 'partner' ? 'partner_portal' : 'company_erp'
        });
      }
    }

    const pendingInvites = [];
    const cleanEmail = (email || '').toLowerCase().trim();
    for (const [id, inv] of this.invitations.entries()) {
      if (inv.targetEmail === cleanEmail && inv.status === 'pending') {
        pendingInvites.push(inv);
      }
    }

    return { workspaces, pendingInvites };
  }
}

// ──────────────────────────────────────────────────────────
// Node.js Test Suite
// ──────────────────────────────────────────────────────────

test('1. 신규 회원사 가입 즉시 이용: 승인 대기/희망 ID 입력란 없이 자동 발급 및 30일 무료 체험 즉시 활성화', () => {
  const system = new LinkerXTenantSystem();

  // 신규 대표자가 회사 정보 제출 (원클릭 즉시 가입)
  const result = system.registerNewTenantDirect('uid_user_new', 'ceo@busanfish.com', {
    companyName: '부산피싱유통',
    businessNo: '602-81-99887',
    ceoName: '정부산',
    phone: '051-123-4567'
  });

  assert.equal(result.ok, true);
  assert.match(result.companyId, /^comp_/);
  assert.equal(result.companyName, '부산피싱유통');
  assert.equal(result.isDuplicateSubmission, false);

  // 무료 체험 30일 기간 검증
  const diffDays = Math.round((new Date(result.trialEndsAt) - new Date()) / (24 * 60 * 60 * 1000));
  assert.equal(diffDays, 30);

  // 회원사 및 관리자 권한 즉시 확인 (승인 대기 없이 즉시 업무 시작)
  const userWs = system.getUserWorkspaces('uid_user_new', 'ceo@busanfish.com');
  assert.equal(userWs.workspaces.length, 1);
  assert.equal(userWs.workspaces[0].companyId, result.companyId);
  assert.equal(userWs.workspaces[0].role, 'tenant_admin');

  // 직원 관리 대표 계정 자동 생성 검증 (대표 아이디 및 등록 정보 반영)
  const staffs = system.staffList.get(result.companyId);
  assert.equal(staffs.length, 1);
  assert.equal(staffs[0].userId, 'ceo');
  assert.equal(staffs[0].name, '정부산');
  assert.equal(staffs[0].phone, '051-123-4567');
  assert.equal(staffs[0].email, 'ceo@busanfish.com');
  assert.equal(staffs[0].role, 'admin');
  assert.equal(staffs[0].jobTitle, '대표');
  assert.equal(staffs[0].warehouse, '기본 창고');
  assert.equal(staffs[0].accountStatus, 'linked');

  // 창고 관리 기본 창고 자동 생성 검증
  const whs = system.warehouses.get(result.companyId);
  assert.equal(whs.length, 1);
  assert.equal(whs[0].name, '기본 창고');
  assert.equal(whs[0].isMain, true);
  assert.equal(whs[0].manager, '정부산');
});

test('2. 중복 제출 방어: 동일 회원사 재신청 시 체험 기간 리셋 금지 및 기존 발급 정보 유지', () => {
  const system = new LinkerXTenantSystem();

  const first = system.registerNewTenantDirect('uid_user_1', 'ceo@ocean.com', {
    companyName: '대양마린',
    businessNo: '123-45-67890',
    ceoName: '김대양',
    phone: '010-1111-2222'
  });

  const originalTrialEndsAt = first.trialEndsAt;

  // 동일 사업자등록번호로 재신청 시도
  const second = system.registerNewTenantDirect('uid_user_2', 'staff@ocean.com', {
    companyName: '대양마린 재신청',
    businessNo: '123-45-67890',
    ceoName: '김대양',
    phone: '010-1111-2222'
  });

  assert.equal(second.companyId, first.companyId, '동일 회사 ID 유지');
  assert.equal(second.trialEndsAt, originalTrialEndsAt, '체험 기간이 다시 시작되지 않고 원래 기간 유지');
  assert.equal(second.isDuplicateSubmission, true);
});

test('3. 기존 동명크릴 회원사 보호: 사업자번호 일치해도 자동 권한 부여 금지 (슈퍼관리자 확인 절차 보존)', () => {
  const system = new LinkerXTenantSystem();

  // 기존 등록된 no1dmkr(동명크릴)의 사업자번호로 신규 즉시 가입을 시도할 때
  assert.throws(() => {
    system.registerNewTenantDirect('uid_impostor', 'fake@fish.com', {
      companyName: '동명크릴 사칭',
      businessNo: '617-81-12345', // 동명크릴 기존 사업자번호
      ceoName: '사칭자',
      phone: '010-9999-9999'
    });
  }, /슈퍼관리자 자격 확인 후 연결/);
});

test('4. 직원 초대: 회사 관리자가 권한 지정 초대 발송 -> 직원이 개인 이메일로 로그인 후 수락하여 연결', () => {
  const system = new LinkerXTenantSystem();

  // 동명크릴 관리자가 새 직원 초대
  const invite = system.createStaffInvitation('uid_ceo_dongmyeong', 'no1dmkr', {
    targetEmail: 'new_staff@dongmyeong.com',
    staffName: '홍길동',
    phone: '010-5555-6666',
    permissions: { orders: true, loading: true, invoices: false, inventory: true }
  });

  assert.equal(invite.type, 'staff');
  assert.equal(invite.status, 'pending');

  // 직원이 본인 개인 계정으로 로그인 시 대기 초대 목록 조회
  const wsBefore = system.getUserWorkspaces('uid_staff_hong', 'new_staff@dongmyeong.com');
  assert.equal(wsBefore.pendingInvites.length, 1);
  assert.equal(wsBefore.pendingInvites[0].id, invite.id);

  // 타인이 수락 시도 시 거부
  assert.throws(() => {
    system.acceptInvitation('uid_other', 'hacker@fish.com', invite.id);
  }, /초대 대상 이메일 계정으로 로그인해야/);

  // 본인 계정으로 초대 수락
  const acceptRes = system.acceptInvitation('uid_staff_hong', 'new_staff@dongmyeong.com', invite.id);
  assert.equal(acceptRes.ok, true);
  assert.equal(acceptRes.role, 'tenant_staff');

  // 수락 후 소속 및 부여된 권한 확인
  const wsAfter = system.getUserWorkspaces('uid_staff_hong', 'new_staff@dongmyeong.com');
  assert.equal(wsAfter.workspaces.length, 1);
  assert.equal(wsAfter.workspaces[0].companyId, 'no1dmkr');
  assert.equal(wsAfter.workspaces[0].role, 'tenant_staff');
});

test('5. 거래처 주문 초대 및 주문 제출: 자체 ERP 개설 없이 주문 -> 공급사 수주에 즉시 반영 & 데이터 격리', () => {
  const system = new LinkerXTenantSystem();

  // 동명크릴 관리자가 남해낚시마트(part_namhae) 담당자에게 주문 초대
  const partnerInv = system.createPartnerInvitation('uid_ceo_dongmyeong', 'no1dmkr', {
    partnerId: 'part_namhae',
    targetEmail: 'namhae_owner@fish.kr',
    contactName: '박남해',
    phone: '055-867-0001'
  });

  assert.equal(partnerInv.type, 'partner_order');
  assert.equal(partnerInv.partnerId, 'part_namhae');

  // 남해낚시마트 사장님이 개인 계정으로 로그인하여 초대 수락
  system.acceptInvitation('uid_namhae_boss', 'namhae_owner@fish.kr', partnerInv.id);

  // 워크스페이스 조회 시 'partner_portal' 권한 확인
  const ws = system.getUserWorkspaces('uid_namhae_boss', 'namhae_owner@fish.kr');
  assert.equal(ws.workspaces.length, 1);
  assert.equal(ws.workspaces[0].type, 'partner_portal');
  assert.equal(ws.workspaces[0].partnerId, 'part_namhae');

  // 거래처 포털에서 새 주문 발주 제출
  const newOrder = system.createPartnerOrder('uid_namhae_boss', 'no1dmkr', [
    { name: '크릴새우 1kg', qty: 40, price: 5500 },
    { name: '제주 각크릴', qty: 20, price: 6000 }
  ], '내일 새벽 5시 배송 요청');

  assert.equal(newOrder.totalAmount, 340000);
  assert.equal(newOrder.partnerId, 'part_namhae');

  // 공급사(동명크릴)의 수주 목록에 즉시 추가되었는지 검증
  const dongmyeongOrders = system.salesOrders.get('no1dmkr');
  assert.ok(dongmyeongOrders.some(o => o.id === newOrder.id));

  // 거래처는 본인 매장 자료만 조회 가능하며, 타 거래처 및 공급사 내부 원가/재고 접근 원천 차단
  const partnerView = system.getPartnerViewData('uid_namhae_boss', 'no1dmkr');
  assert.equal(partnerView.orders.length, 2); // 기존 1건 + 신규 1건
  assert.equal(partnerView.invoices.length, 1); // 남해낚시마트 전표만 조회
  assert.equal(partnerView.internalCostPrice, undefined, '공급사 원가 비공개');
  assert.equal(partnerView.internalInventory, undefined, '공급사 전체 재고 비공개');
});

test('6. 회원사 간 링커 연결: 양사 관리자 간 요청 및 수락 -> linkedCompanyId 연결 및 기존 이력 보존', () => {
  const system = new LinkerXTenantSystem();

  // 신규 회원사 바다물산 가입
  const oceanRes = system.registerNewTenantDirect('uid_ceo_ocean', 'ceo@bada.com', {
    companyName: '바다물산',
    businessNo: '505-88-22334',
    ceoName: '최바다',
    phone: '051-777-8888'
  });
  const oceanCid = oceanRes.companyId;

  // 바다물산의 거래처 목록에 동명크릴 등록
  system.partners.set(oceanCid, [
    { id: 'part_dongmyeong_in_ocean', name: '동명크릴', linkedCompanyId: null }
  ]);

  // 동명크릴의 거래처 목록에 바다물산 등록
  const dongmyeongPartners = system.partners.get('no1dmkr');
  dongmyeongPartners.push({
    id: 'part_ocean_in_dongmyeong',
    name: '바다물산',
    linkedCompanyId: null
  });

  // 동명크릴 관리자가 바다물산으로 B2B 회원사 링커 연결 요청 발송
  const linkReq = system.requestCompanyLink('uid_ceo_dongmyeong', 'no1dmkr', oceanCid, 'part_ocean_in_dongmyeong');
  assert.equal(linkReq.status, 'pending');

  // 바다물산 관리자가 수신된 요청을 확인하고 본인의 거래처와 매칭하여 수락
  system.acceptCompanyLink('uid_ceo_ocean', oceanCid, linkReq.id, 'part_dongmyeong_in_ocean');

  // 양사 거래처 문서에 상대 회원사 ID(linkedCompanyId)가 연계되었는지 확인
  const pInDongmyeong = system.partners.get('no1dmkr').find(p => p.id === 'part_ocean_in_dongmyeong');
  const pInOcean = system.partners.get(oceanCid).find(p => p.id === 'part_dongmyeong_in_ocean');

  assert.equal(pInDongmyeong.linkedCompanyId, oceanCid, '동명크릴 측 거래처에 바다물산 회사 ID 연결');
  assert.equal(pInOcean.linkedCompanyId, 'no1dmkr', '바다물산 측 거래처에 동명크릴 회사 ID 연결');
  assert.equal(pInDongmyeong.name, '바다물산', '기존 거래처명 및 거래처 코드 보존');
});

test('7. 로그인 후 다중 소속 및 워크스페이스 선택 뷰 분기 (회사 ID 텍스트 직접 입력 완전 제거)', () => {
  const system = new LinkerXTenantSystem();

  // 사용자 A: 1개 회사 관리자 -> 바로 자동 입장
  const wsA = system.getUserWorkspaces('uid_ceo_dongmyeong', 'ceo@dongmyeong.com');
  assert.equal(wsA.workspaces.length, 1);
  assert.equal(wsA.pendingInvites.length, 0);

  // 사용자 B: 본인 회사 관리자이면서 다른 회사 거래처 주문 권한 보유 -> 워크스페이스 선택 필요
  system.memberships.set('uid_multi_user_no1dmkr', {
    uid: 'uid_multi_user',
    companyId: 'no1dmkr',
    companyName: '동명크릴',
    role: 'tenant_admin',
    status: 'active'
  });
  system.memberships.set('uid_multi_user_comp_other', {
    uid: 'uid_multi_user',
    companyId: 'comp_other',
    companyName: '해양상사',
    role: 'partner',
    partnerId: 'part_retail',
    status: 'active'
  });

  const wsB = system.getUserWorkspaces('uid_multi_user', 'multi@fisher.com');
  assert.equal(wsB.workspaces.length, 2, '다중 소속 확인: 카드 선택 화면으로 진입 (회사 ID 직접 입력 불필요)');
});
