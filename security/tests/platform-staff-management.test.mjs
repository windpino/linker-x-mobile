import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * 링커엑스(Linker X) 슈퍼관리자 대시보드 - '링커엑스 직원 관리' 및 운영팀 보안 검증 테스트
 * 
 * 1. 슈퍼관리자 전용 운영팀 직원 등록 및 로그인 초대 발송 (슈퍼관리자 검증 & 비인가자 차단)
 * 2. 초대받은 직원의 이메일 인증 및 UID 연결 (4개 상태 뱃지 & 수락 멱등성 검증)
 * 3. 운영팀 역할별 최소 권한 원칙 (PoLP): 고객지원(CS) vs 구독관리(Billing) & 회원사 비즈니스 원본 차단
 * 4. 다중 소속 (본사 운영팀 + 회원사) 독립성 및 작업공간 선택 (상호 간섭 원천 차단)
 * 5. 운영 역할 변경 및 퇴사(접근 해제) 처리 (회원사 소속/업무 기록 보존 & 감사로그 기록)
 */

class MockLinkerXPlatformSystem {
  constructor() {
    // 1. 슈퍼관리자 및 사용자 계정 풀
    this.users = new Map([
      ['super_admin_uid', { uid: 'super_admin_uid', email: 'admin@linker-x.com', displayName: '슈퍼관리자', isSuperAdmin: true }],
      ['tenant_admin_uid', { uid: 'tenant_admin_uid', email: 'ceo@dongmyeong.com', displayName: '동명대표', isSuperAdmin: false }],
      ['cs_staff_uid', { uid: 'cs_staff_uid', email: 'support_kim@linker-x.com', displayName: '김지원', isSuperAdmin: false }],
      ['billing_staff_uid', { uid: 'billing_staff_uid', email: 'billing_park@linker-x.com', displayName: '박구독', isSuperAdmin: false }],
      ['attacker_uid', { uid: 'attacker_uid', email: 'attacker@evil.com', displayName: '공격자', isSuperAdmin: false }]
    ]);

    // 2. 링커엑스 본사 직원 카드 마스터 (platformStaff)
    this.platformStaff = new Map([
      ['pstaff_101', {
        id: 'pstaff_101',
        name: '김지원',
        userId: 'support_kim',
        email: 'support_kim@linker-x.com',
        role: 'support',
        dept: '고객경험(CS)팀',
        tasks: '고객 문의 및 시스템 오류 확인',
        accountStatus: 'unlinked', // 'unlinked' | 'invited' | 'linked' | 'revoked'
        status: '계정 미연결',
        linkedUid: null,
        linkedEmail: null,
        resigned: false
      }],
      ['pstaff_102', {
        id: 'pstaff_102',
        name: '박구독',
        userId: 'billing_park',
        email: 'billing_park@linker-x.com',
        role: 'subscription',
        dept: '구독관리팀',
        tasks: '회원사 요금제 및 결제 상태 관리',
        accountStatus: 'unlinked',
        status: '계정 미연결',
        linkedUid: null,
        linkedEmail: null,
        resigned: false
      }]
    ]);

    // 3. 실제 접근 권한 (platformAccess) - UID 기준
    this.platformAccess = new Map([
      ['super_admin_uid', {
        uid: 'super_admin_uid',
        status: 'active',
        role: 'super_admin',
        permissions: { all: true, tenantBusinessData: true }
      }]
    ]);

    // 4. 회원사 테넌트 및 멤버십
    this.companies = new Map([
      ['no1dmkr', { id: 'no1dmkr', name: '동명크릴', status: 'active', plan: '스탠다드' }]
    ]);

    this.memberships = new Map([
      ['tenant_admin_uid_no1dmkr', {
        uid: 'tenant_admin_uid',
        companyId: 'no1dmkr',
        companyName: '동명크릴',
        role: 'tenant_admin',
        status: 'active'
      }]
    ]);

    // 회원사 비즈니스 원본 데이터 (주문, 전표 등)
    this.tenantBusinessData = [
      { id: 'order_1001', companyId: 'no1dmkr', product: '크릴 미끼 50박스', price: 1500000, secretMargin: 350000 }
    ];

    this.invitations = new Map();
    this.auditLogs = [];
  }

  // 슈퍼관리자 권한 검증 헬퍼
  isSuperAdmin(uid) {
    const access = this.platformAccess.get(uid);
    const user = this.users.get(uid);
    return (access?.status === 'active' && access?.role === 'super_admin') || Boolean(user?.isSuperAdmin);
  }

  // 1. 슈퍼관리자의 운영팀 직원 초대
  createPlatformStaffInvitation(actorUid, staffId, targetEmail, role) {
    if (!this.isSuperAdmin(actorUid)) {
      throw new Error('permission-denied: 슈퍼관리자만 운영팀 직원을 초대할 수 있습니다.');
    }
    const staff = this.platformStaff.get(staffId);
    if (!staff) throw new Error('not-found: 직원 카드를 찾을 수 없습니다.');
    if (staff.accountStatus === 'linked' && staff.linkedEmail && staff.linkedEmail !== targetEmail) {
      throw new Error(`already-exists: 이미 다른 계정(${staff.linkedEmail})에 연결된 직원 카드입니다.`);
    }

    const email = String(targetEmail).toLowerCase().trim();
    const invId = `inv_pstaff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const permissions = role === 'support'
      ? { tickets: true, errors: true, sync: true, tenantBusinessData: false }
      : role === 'subscription'
      ? { subscriptions: true, billing: true, tenantBusinessData: false }
      : { errors: true, sync: true, tenantBusinessData: false };

    const inv = {
      id: invId,
      type: 'platform_staff',
      staffId,
      staffName: staff.name,
      targetEmail: email,
      role,
      permissions,
      invitedBy: actorUid,
      status: 'pending',
      expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
      createdAt: Date.now()
    };
    this.invitations.set(invId, inv);

    // 직원 카드 상태 업데이트 (초대 발송)
    staff.accountStatus = 'invited';
    staff.status = '초대 발송';
    staff.email = email;
    staff.role = role;

    this.auditLogs.push({
      actor: actorUid,
      target: staffId,
      targetEmail: email,
      role,
      action: 'createPlatformStaffInvitation',
      at: Date.now()
    });

    return { ok: true, invitationId: invId };
  }

  // 2. 초대 수락 (초대받은 본인 계정으로 수락 및 UID 연결)
  acceptInvitation(uid, invitationId) {
    const user = this.users.get(uid);
    if (!user) throw new Error('unauthenticated');

    const inv = this.invitations.get(invitationId);
    if (!inv || inv.status !== 'pending') {
      throw new Error('invalid-argument: 유효하지 않거나 이미 처리된 초대입니다.');
    }
    if (Date.now() > inv.expiresAt) {
      throw new Error('deadline-exceeded: 초대 유효기간(14일)이 만료되었습니다.');
    }
    if (inv.targetEmail !== (user.email || '').toLowerCase().trim()) {
      throw new Error('permission-denied: 초대 대상 이메일 계정으로 로그인해야 수락할 수 있습니다.');
    }

    if (inv.type === 'platform_staff') {
      const staff = this.platformStaff.get(inv.staffId);
      if (staff.linkedUid && staff.linkedUid !== uid) {
        throw new Error('already-exists: 이미 다른 계정에 연결된 운영팀 직원 카드입니다.');
      }

      // UID 연결 및 뱃지 업데이트
      staff.accountStatus = 'linked';
      staff.status = '연결 완료';
      staff.linkedUid = uid;
      staff.linkedEmail = user.email;

      // 본사 운영 권한 활성화
      this.platformAccess.set(uid, {
        uid,
        status: 'active',
        role: inv.role,
        staffId: inv.staffId,
        permissions: inv.permissions,
        approvedBy: inv.invitedBy,
        approvedAt: Date.now()
      });

      inv.status = 'accepted';
      inv.acceptedBy = uid;
      inv.acceptedAt = Date.now();

      this.auditLogs.push({
        actor: uid,
        target: inv.staffId,
        targetEmail: user.email,
        action: 'acceptPlatformStaffInvitation',
        role: inv.role,
        at: Date.now()
      });

      return { ok: true, status: 'accepted', role: inv.role };
    }
  }

  // 3. 운영팀 직원 역할 변경 (슈퍼관리자)
  updatePlatformStaffRole(actorUid, staffId, newRole) {
    if (!this.isSuperAdmin(actorUid)) {
      throw new Error('permission-denied: 슈퍼관리자만 역할을 변경할 수 있습니다.');
    }
    const staff = this.platformStaff.get(staffId);
    if (!staff) throw new Error('not-found');

    const oldRole = staff.role;
    staff.role = newRole;
    const permissions = newRole === 'support'
      ? { tickets: true, errors: true, sync: true, tenantBusinessData: false }
      : newRole === 'subscription'
      ? { subscriptions: true, billing: true, tenantBusinessData: false }
      : { errors: true, sync: true, tenantBusinessData: false };

    if (staff.linkedUid) {
      const access = this.platformAccess.get(staff.linkedUid);
      if (access) {
        access.role = newRole;
        access.permissions = permissions;
      }
    }

    this.auditLogs.push({
      actor: actorUid,
      target: staffId,
      targetUid: staff.linkedUid,
      oldRole,
      newRole,
      action: 'updatePlatformStaffRole',
      at: Date.now()
    });

    return { ok: true, staffId, newRole };
  }

  // 4. 퇴사 및 접근 권한 회수 (슈퍼관리자)
  revokePlatformStaffAccess(actorUid, staffId) {
    if (!this.isSuperAdmin(actorUid)) {
      throw new Error('permission-denied: 슈퍼관리자만 운영팀 접근 권한을 해제할 수 있습니다.');
    }
    const staff = this.platformStaff.get(staffId);
    if (!staff) throw new Error('not-found');

    const uidToRevoke = staff.linkedUid;
    staff.accountStatus = 'revoked';
    staff.status = '접근해제';
    staff.resigned = true;

    if (uidToRevoke) {
      const access = this.platformAccess.get(uidToRevoke);
      if (access) {
        access.status = 'revoked';
      }
    }

    this.auditLogs.push({
      actor: actorUid,
      target: staffId,
      targetUid: uidToRevoke,
      action: 'revokePlatformStaffAccess',
      at: Date.now()
    });

    return { ok: true, staffId, revokedUid: uidToRevoke };
  }

  // 5. 작업공간 조회 (다중 소속 확인)
  getMyWorkspaces(uid) {
    const workspaces = [];

    // 본사 운영팀 소속 확인
    const pAccess = this.platformAccess.get(uid);
    if (pAccess && pAccess.status === 'active') {
      const isSuper = pAccess.role === 'super_admin';
      workspaces.push({
        companyId: 'linker_x_hq',
        companyName: '링커엑스(Linker X) 본사 운영팀',
        role: pAccess.role,
        authRole: isSuper ? 'platform_admin' : 'platform_ops',
        isPlatformStaff: true,
        isSuperAdmin: isSuper,
        type: 'platform_ops'
      });
    }

    // 회원사 소속 확인
    for (const [key, mem] of this.memberships.entries()) {
      if (mem.uid === uid && mem.status === 'active') {
        workspaces.push({
          companyId: mem.companyId,
          companyName: mem.companyName,
          role: mem.role === 'tenant_admin' ? 'admin' : 'staff',
          authRole: mem.role,
          type: 'company_work'
        });
      }
    }

    return workspaces;
  }

  // 6. 회원사 비즈니스 원본 열람 시도 (최소 권한 원칙 검증)
  readTenantBusinessData(uid, companyId) {
    const pAccess = this.platformAccess.get(uid);
    const membership = this.memberships.get(`${uid}_${companyId}`);

    // 회원사 관리자/직원으로서의 권한 확인
    if (membership && membership.status === 'active') {
      return this.tenantBusinessData.filter(d => d.companyId === companyId);
    }

    // 본사 운영자로서의 조회 시도
    if (pAccess && pAccess.status === 'active') {
      if (pAccess.permissions.tenantBusinessData === true) {
        return this.tenantBusinessData.filter(d => d.companyId === companyId);
      }
      throw new Error('permission-denied: 최소 권한 원칙(PoLP)에 따라 회원사의 주문·전표 원본 열람이 제한됩니다. (건별 지원 동의 필요)');
    }

    throw new Error('permission-denied: 접근 권한이 없습니다.');
  }
}

// ─────────────────────────────────────────────────────────────
// 테스트 스위트
// ─────────────────────────────────────────────────────────────

test('1. 슈퍼관리자 전용 운영팀 직원 등록 및 로그인 초대 발송 검증', async () => {
  const sys = new MockLinkerXPlatformSystem();

  // (1) 일반 회원사 관리자나 공격자가 운영팀 직원을 초대하려 하면 차단
  assert.throws(
    () => sys.createPlatformStaffInvitation('tenant_admin_uid', 'pstaff_101', 'support_kim@linker-x.com', 'support'),
    /permission-denied/
  );
  assert.throws(
    () => sys.createPlatformStaffInvitation('attacker_uid', 'pstaff_101', 'support_kim@linker-x.com', 'support'),
    /permission-denied/
  );

  // (2) 슈퍼관리자가 정상적으로 초대 발송
  const res = sys.createPlatformStaffInvitation('super_admin_uid', 'pstaff_101', 'support_kim@linker-x.com', 'support');
  assert.strictEqual(res.ok, true);

  // (3) 직원 카드 상태가 '초대 발송' (invited)으로 즉시 업데이트됨
  const staff = sys.platformStaff.get('pstaff_101');
  assert.strictEqual(staff.accountStatus, 'invited');
  assert.strictEqual(staff.status, '초대 발송');
  assert.strictEqual(staff.email, 'support_kim@linker-x.com');

  // (4) 감사 로그 기록 확인
  const lastAudit = sys.auditLogs[sys.auditLogs.length - 1];
  assert.strictEqual(lastAudit.action, 'createPlatformStaffInvitation');
  assert.strictEqual(lastAudit.actor, 'super_admin_uid');
  assert.strictEqual(lastAudit.target, 'pstaff_101');
});

test('2. 초대받은 직원의 이메일 인증, UID 연결 및 멱등성 검증', async () => {
  const sys = new MockLinkerXPlatformSystem();
  const inviteRes = sys.createPlatformStaffInvitation('super_admin_uid', 'pstaff_101', 'support_kim@linker-x.com', 'support');

  // (1) 다른 이메일을 사용하는 사용자가 초대를 가로채려 하면 거부
  assert.throws(
    () => sys.acceptInvitation('attacker_uid', inviteRes.invitationId),
    /permission-denied/
  );

  // (2) 초대 대상 이메일로 인증된 본인 계정(cs_staff_uid)이 정상 수락
  const acceptRes = sys.acceptInvitation('cs_staff_uid', inviteRes.invitationId);
  assert.strictEqual(acceptRes.ok, true);
  assert.strictEqual(acceptRes.status, 'accepted');
  assert.strictEqual(acceptRes.role, 'support');

  // (3) 직원 카드가 '연결 완료' (linked) 상태로 변경되고 UID가 바인딩됨
  const staff = sys.platformStaff.get('pstaff_101');
  assert.strictEqual(staff.accountStatus, 'linked');
  assert.strictEqual(staff.status, '연결 완료');
  assert.strictEqual(staff.linkedUid, 'cs_staff_uid');

  // (4) platformAccess 컬렉션에 해당 UID의 운영 권한이 활성화됨
  const access = sys.platformAccess.get('cs_staff_uid');
  assert.ok(access);
  assert.strictEqual(access.status, 'active');
  assert.strictEqual(access.role, 'support');

  // (5) 멱등성: 이미 수락된 초대를 다시 열거나 재시도할 경우 안전하게 에러 반환 (중복 생성 방지)
  assert.throws(
    () => sys.acceptInvitation('cs_staff_uid', inviteRes.invitationId),
    /유효하지 않거나 이미 처리된 초대/
  );
});

test('3. 운영팀 역할별 최소 권한 원칙 (PoLP) 및 회원사 원본 데이터 차단 검증', async () => {
  const sys = new MockLinkerXPlatformSystem();

  // 김지원(CS) 및 박구독(Billing) 초대 및 수락
  const inv1 = sys.createPlatformStaffInvitation('super_admin_uid', 'pstaff_101', 'support_kim@linker-x.com', 'support');
  sys.acceptInvitation('cs_staff_uid', inv1.invitationId);

  const inv2 = sys.createPlatformStaffInvitation('super_admin_uid', 'pstaff_102', 'billing_park@linker-x.com', 'subscription');
  sys.acceptInvitation('billing_staff_uid', inv2.invitationId);

  // (1) CS 담당자 권한 확인 (tickets, errors, sync 허용)
  const csAccess = sys.platformAccess.get('cs_staff_uid');
  assert.strictEqual(csAccess.role, 'support');
  assert.strictEqual(csAccess.permissions.tickets, true);
  assert.strictEqual(csAccess.permissions.errors, true);
  assert.strictEqual(csAccess.permissions.sync, true);
  assert.strictEqual(csAccess.permissions.tenantBusinessData, false);

  // (2) 구독관리 담당자 권한 확인 (subscriptions, billing 허용)
  const billingAccess = sys.platformAccess.get('billing_staff_uid');
  assert.strictEqual(billingAccess.role, 'subscription');
  assert.strictEqual(billingAccess.permissions.subscriptions, true);
  assert.strictEqual(billingAccess.permissions.billing, true);
  assert.strictEqual(billingAccess.permissions.tenantBusinessData, false);

  // (3) 두 역할 모두 회원사의 주문 원본 데이터 열람 시 차단
  assert.throws(
    () => sys.readTenantBusinessData('cs_staff_uid', 'no1dmkr'),
    /최소 권한 원칙.*주문·전표 원본 열람이 제한됩니다/
  );
  assert.throws(
    () => sys.readTenantBusinessData('billing_staff_uid', 'no1dmkr'),
    /최소 권한 원칙.*주문·전표 원본 열람이 제한됩니다/
  );

  // (4) 회원사 대표(tenant_admin_uid)는 자기 회사의 주문 원본 데이터 정상 조회 가능
  const data = sys.readTenantBusinessData('tenant_admin_uid', 'no1dmkr');
  assert.strictEqual(data.length, 1);
  assert.strictEqual(data[0].product, '크릴 미끼 50박스');
});

test('4. 다중 소속 (본사 운영팀 + 회원사) 독립성 및 작업공간 선택 검증', async () => {
  const sys = new MockLinkerXPlatformSystem();

  // 김지원(cs_staff_uid)이 링커엑스 본사 운영팀이면서 동시에 '동명크릴'의 직원으로 등록된 경우
  const inv = sys.createPlatformStaffInvitation('super_admin_uid', 'pstaff_101', 'support_kim@linker-x.com', 'support');
  sys.acceptInvitation('cs_staff_uid', inv.invitationId);

  sys.memberships.set('cs_staff_uid_no1dmkr', {
    uid: 'cs_staff_uid',
    companyId: 'no1dmkr',
    companyName: '동명크릴',
    role: 'staff',
    status: 'active'
  });

  // (1) getMyWorkspaces에서 두 작업공간이 모두 반환되어야 함
  const workspaces = sys.getMyWorkspaces('cs_staff_uid');
  assert.strictEqual(workspaces.length, 2);

  const hqWs = workspaces.find(w => w.companyId === 'linker_x_hq');
  const dmWs = workspaces.find(w => w.companyId === 'no1dmkr');

  assert.ok(hqWs);
  assert.strictEqual(hqWs.type, 'platform_ops');
  assert.strictEqual(hqWs.role, 'support');

  assert.ok(dmWs);
  assert.strictEqual(dmWs.type, 'company_work');
  assert.strictEqual(dmWs.role, 'staff');

  // (2) 동명크릴 직원 자격으로는 해당 회사의 비즈니스 데이터 접근 가능 (회원사 소속으로서의 업무)
  const tenantData = sys.readTenantBusinessData('cs_staff_uid', 'no1dmkr');
  assert.strictEqual(tenantData.length, 1);
});

test('5. 역할 변경, 퇴사(접근 해제) 처리 및 기존 데이터 보존 검증', async () => {
  const sys = new MockLinkerXPlatformSystem();
  const inv = sys.createPlatformStaffInvitation('super_admin_uid', 'pstaff_101', 'support_kim@linker-x.com', 'support');
  sys.acceptInvitation('cs_staff_uid', inv.invitationId);

  // 회원사 소속도 함께 보유
  sys.memberships.set('cs_staff_uid_no1dmkr', {
    uid: 'cs_staff_uid',
    companyId: 'no1dmkr',
    companyName: '동명크릴',
    role: 'staff',
    status: 'active'
  });

  // (1) 역할 변경: support -> subscription
  sys.updatePlatformStaffRole('super_admin_uid', 'pstaff_101', 'subscription');
  const updatedStaff = sys.platformStaff.get('pstaff_101');
  const updatedAccess = sys.platformAccess.get('cs_staff_uid');
  assert.strictEqual(updatedStaff.role, 'subscription');
  assert.strictEqual(updatedAccess.role, 'subscription');
  assert.strictEqual(updatedAccess.permissions.subscriptions, true);

  // (2) 본사 운영팀 퇴사 처리 (접근 권한 회수)
  sys.revokePlatformStaffAccess('super_admin_uid', 'pstaff_101');

  // 직원 카드 상태가 '접근해제' (revoked)로 변경됨
  assert.strictEqual(updatedStaff.accountStatus, 'revoked');
  assert.strictEqual(updatedStaff.status, '접근해제');
  assert.strictEqual(updatedStaff.resigned, true);

  // 본사 접근 권한(platformAccess)이 'revoked'로 차단됨
  assert.strictEqual(updatedAccess.status, 'revoked');

  // (3) 본사 운영팀 작업공간은 더 이상 노출되지 않음
  const workspacesAfterRevoke = sys.getMyWorkspaces('cs_staff_uid');
  assert.strictEqual(workspacesAfterRevoke.length, 1);
  assert.strictEqual(workspacesAfterRevoke[0].companyId, 'no1dmkr'); // 회원사 소속은 온전히 보존됨!

  // (4) 회원사 소속(동명크릴) 및 이전 업무 이력은 전혀 손상되지 않음
  const dmMembership = sys.memberships.get('cs_staff_uid_no1dmkr');
  assert.strictEqual(dmMembership.status, 'active');

  // (5) 감사 로그(authAudit)에 권한 회수 이력이 정확히 남음
  const revokeAudit = sys.auditLogs.find(a => a.action === 'revokePlatformStaffAccess');
  assert.ok(revokeAudit);
  assert.strictEqual(revokeAudit.actor, 'super_admin_uid');
  assert.strictEqual(revokeAudit.target, 'pstaff_101');
  assert.strictEqual(revokeAudit.targetUid, 'cs_staff_uid');
});
