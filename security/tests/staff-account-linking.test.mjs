import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * 링커엑스(Linker X) 직원 등록 및 이메일 계정 연결 검증 테스트
 * 1. 기존 직원 초대 (관리자 초대 발송 -> 직원 수락 -> 기존 카드 연결 & 대표 이메일 생략)
 * 2. 직원의 직접 요청 (대표 이메일로 요청 -> '관리자 연결 대기' -> 관리자가 기존 직원에 연결 -> 업무 화면 진입)
 * 3. 미등록 신입 등록 후 연결 (직원 직접 요청 -> 관리자가 신규 등록 화면에서 등록 후 연결)
 * 4. 두 경로가 겹치는 경우 (초대와 직접 요청 동시 발생 멱등성 & 타 계정 덮어쓰기 원천 차단)
 * 5. 퇴사 후 접근 해제 (퇴사 처리 시 소속 접근 권한 즉시 차단 & 기존 업무 기록 영구 보존)
 */

class MockLinkerXStaffSystem {
  constructor() {
    this.companies = new Map([
      ['no1dmkr', {
        id: 'no1dmkr',
        name: '동명크릴',
        representativeEmail: 'ceo@dongmyeong.com',
        status: 'active'
      }]
    ]);

    // 회사의 직원 카드 명단 (기존 상차/전표 등 업무 기록에 staffId가 연결됨)
    this.staffList = new Map([
      ['no1dmkr', [
        {
          id: 'staff_001',
          userId: 'dm_kim',
          name: '김동명',
          jobTitle: '과장',
          warehouse: '부산본점창고',
          phone: '010-1111-2222',
          accountStatus: 'unlinked', // 'unlinked' | 'invited' | 'linked'
          linkedUid: null,
          linkedEmail: null,
          permissions: { orders: true, loading: true, invoices: true }
        },
        {
          id: 'staff_002',
          userId: 'dm_lee',
          name: '이수산',
          jobTitle: '대리',
          warehouse: '남해물류창고',
          phone: '010-3333-4444',
          accountStatus: 'unlinked',
          linkedUid: null,
          linkedEmail: null,
          permissions: { orders: true, loading: true }
        }
      ]]
    ]);

    // 과거 업무 기록 (상차 전표, 매출 전표 등)
    this.businessRecords = [
      { id: 'inv_101', type: 'invoice', staffId: 'staff_001', staffName: '김동명', amount: 1500000 },
      { id: 'load_201', type: 'loading', staffId: 'staff_001', staffName: '김동명', vehicle: '88가1234' },
      { id: 'inv_102', type: 'invoice', staffId: 'staff_002', staffName: '이수산', amount: 850000 }
    ];

    this.invitations = new Map();
    this.connectionRequests = new Map();
    this.memberships = new Map(); // key: `${uid}_${companyId}`
  }

  // 1. 관리자가 직원 카드에서 로그인 초대 발송
  createStaffInvitation(adminUid, companyId, staffId, targetEmail) {
    const comp = this.companies.get(companyId);
    if (!comp) throw new Error('회사를 찾을 수 없습니다.');
    const staff = (this.staffList.get(companyId) || []).find(s => s.id === staffId);
    if (!staff) throw new Error('직원 카드를 찾을 수 없습니다.');

    // 이미 다른 계정에 연결된 카드는 초대 불가
    if (staff.accountStatus === 'linked' && staff.linkedEmail && staff.linkedEmail !== targetEmail) {
      throw new Error(`이미 다른 계정(${staff.linkedEmail})에 연결된 직원 카드입니다.`);
    }

    const invId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const invitation = {
      id: invId,
      companyId,
      companyName: comp.name,
      staffId,
      staffName: staff.name,
      targetEmail: targetEmail.toLowerCase().trim(),
      permissions: staff.permissions,
      status: 'pending',
      invitedBy: adminUid,
      createdAt: new Date().toISOString()
    };
    this.invitations.set(invId, invitation);

    // 직원 카드 상태 변경: '초대 발송'
    staff.accountStatus = 'invited';
    staff.invitationEmail = targetEmail;

    return { ok: true, invitationId: invId };
  }

  // 1-1. 직원이 초대 수락 (대표 이메일 재입력 생략)
  acceptInvitation(userUid, userEmail, invitationId) {
    const inv = this.invitations.get(invitationId);
    if (!inv || inv.status !== 'pending') throw new Error('유효하지 않거나 이미 처리된 초대입니다.');
    if (inv.targetEmail !== userEmail.toLowerCase().trim()) {
      throw new Error('초대 대상 이메일 계정으로 로그인해야 수락할 수 있습니다.');
    }

    const staff = (this.staffList.get(inv.companyId) || []).find(s => s.id === inv.staffId);
    if (!staff) throw new Error('직원 카드를 찾을 수 없습니다.');

    // 다른 UID가 이미 연결되어 있는지 검증
    if (staff.linkedUid && staff.linkedUid !== userUid) {
      throw new Error(`이미 다른 계정(${staff.linkedEmail})에 연결된 직원 카드입니다.`);
    }

    // 직원 카드에 계정 연결
    staff.accountStatus = 'linked';
    staff.linkedUid = userUid;
    staff.linkedEmail = userEmail;

    // 회사 소속(membership) 활성화
    this.memberships.set(`${userUid}_${inv.companyId}`, {
      uid: userUid,
      email: userEmail,
      companyId: inv.companyId,
      companyName: inv.companyName,
      legacyId: inv.staffId,
      userId: staff.userId,
      role: 'tenant_staff',
      status: 'active',
      permissions: inv.permissions
    });

    inv.status = 'accepted';
    inv.acceptedBy = userUid;

    // 만약 해당 유저의 직접 연결 요청이 대기 중이었다면 함께 승인 처리 (동시/중복 경로 해소)
    const reqKey = `${userUid}_${inv.companyId}`;
    if (this.connectionRequests.has(reqKey)) {
      this.connectionRequests.get(reqKey).status = 'approved';
    }

    return { ok: true, companyId: inv.companyId, staffId: inv.staffId };
  }

  // 2. 직원이 로그인 화면에서 대표 이메일로 연결 직접 요청
  requestStaffConnection(userUid, userEmail, representativeEmail) {
    const repEmail = representativeEmail.toLowerCase().trim();
    // 대표 이메일로 회사 찾기
    let targetCompany = null;
    for (const comp of this.companies.values()) {
      if (comp.representativeEmail && comp.representativeEmail.toLowerCase() === repEmail) {
        targetCompany = comp;
        break;
      }
    }

    if (!targetCompany) {
      throw new Error(`해당 대표 이메일(${representativeEmail})로 등록된 회원사를 찾을 수 없습니다.`);
    }

    const cid = targetCompany.id;
    // 이미 활성 소속이면 즉시 통과
    const existingMem = this.memberships.get(`${userUid}_${cid}`);
    if (existingMem && existingMem.status === 'active') {
      return { ok: true, companyId: cid, companyName: targetCompany.name, status: 'connected', alreadyLinked: true };
    }

    const reqKey = `${userUid}_${cid}`;
    const reqObj = {
      id: reqKey,
      uid: userUid,
      applicantEmail: userEmail.toLowerCase().trim(),
      representativeEmail: repEmail,
      companyId: cid,
      companyName: targetCompany.name,
      status: 'pending', // '관리자 연결 대기'
      createdAt: new Date().toISOString()
    };
    this.connectionRequests.set(reqKey, reqObj);

    return { ok: true, companyId: cid, companyName: targetCompany.name, status: 'pending' };
  }

  // 2-1. 관리자가 대기 요청을 확인하고 기존 직원에 연결
  connectStaffAccount(adminUid, companyId, staffId, applicantUid, applicantEmail) {
    const staff = (this.staffList.get(companyId) || []).find(s => s.id === staffId);
    if (!staff) throw new Error('직원 카드를 찾을 수 없습니다.');

    // 이미 다른 계정에 연결된 직원 카드는 덮어쓰지 않음
    if (staff.linkedUid && staff.linkedUid !== applicantUid) {
      throw new Error(`이미 다른 계정(${staff.linkedEmail})에 연결된 직원 카드입니다.`);
    }

    // 이미 같은 계정에 연결돼 있는 경우 멱등성 유지
    if (staff.linkedUid === applicantUid && this.memberships.get(`${applicantUid}_${companyId}`)?.status === 'active') {
      return { ok: true, alreadyLinked: true };
    }

    // 직원 카드 업데이트
    staff.accountStatus = 'linked';
    staff.linkedUid = applicantUid;
    staff.linkedEmail = applicantEmail;

    // 소속 멤버십 부여
    this.memberships.set(`${applicantUid}_${companyId}`, {
      uid: applicantUid,
      email: applicantEmail,
      companyId,
      companyName: this.companies.get(companyId)?.name || companyId,
      legacyId: staffId,
      userId: staff.userId,
      role: 'tenant_staff',
      status: 'active',
      permissions: staff.permissions
    });

    // 요청 상태 변경
    const reqKey = `${applicantUid}_${companyId}`;
    if (this.connectionRequests.has(reqKey)) {
      this.connectionRequests.get(reqKey).status = 'approved';
    }

    return { ok: true, companyId, staffId, applicantEmail };
  }

  // 3. 미등록 신입 직원 등록 후 연결
  registerStaffAndConnect(adminUid, companyId, newStaffData, applicantUid, applicantEmail) {
    const list = this.staffList.get(companyId) || [];
    const staffId = `staff_${Date.now()}`;
    const newStaff = {
      id: staffId,
      userId: newStaffData.userId || `user_${Date.now()}`,
      name: newStaffData.name,
      jobTitle: newStaffData.jobTitle || '사원',
      warehouse: newStaffData.warehouse || '기본창고',
      phone: newStaffData.phone || '',
      accountStatus: 'linked',
      linkedUid: applicantUid,
      linkedEmail: applicantEmail,
      permissions: newStaffData.permissions || { orders: true }
    };
    list.push(newStaff);
    this.staffList.set(companyId, list);

    // 멤버십 생성
    this.memberships.set(`${applicantUid}_${companyId}`, {
      uid: applicantUid,
      email: applicantEmail,
      companyId,
      companyName: this.companies.get(companyId)?.name || companyId,
      legacyId: staffId,
      userId: newStaff.userId,
      role: 'tenant_staff',
      status: 'active',
      permissions: newStaff.permissions
    });

    const reqKey = `${applicantUid}_${companyId}`;
    if (this.connectionRequests.has(reqKey)) {
      this.connectionRequests.get(reqKey).status = 'approved';
    }

    return { ok: true, staffId, companyId };
  }

  // 5. 직원 퇴사 처리 (계정 접근 해제 & 기존 업무 기록 보존)
  resignStaff(adminUid, companyId, staffId) {
    const staff = (this.staffList.get(companyId) || []).find(s => s.id === staffId);
    if (!staff) throw new Error('직원을 찾을 수 없습니다.');

    const targetUid = staff.linkedUid;

    // 직원 카드 계정 연결 해제 & 퇴사 플래그
    staff.accountStatus = 'unlinked';
    staff.linkedUid = null;
    staff.linkedEmail = null;
    staff.resigned = true;
    staff.resignedAt = new Date().toISOString();

    // 회사 소속 접근 권한 즉시 차단
    if (targetUid) {
      const mem = this.memberships.get(`${targetUid}_${companyId}`);
      if (mem) {
        mem.status = 'resigned';
        mem.resignedAt = new Date().toISOString();
      }
    }

    return { ok: true, staffId, revokedUid: targetUid };
  }

  // 권한 검증
  hasWorkspaceAccess(uid, companyId) {
    const mem = this.memberships.get(`${uid}_${companyId}`);
    return Boolean(mem && mem.status === 'active');
  }
}

// ─────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────

test('1. 기존 직원 초대: 관리자 초대 발송 -> 직원 수락 -> 계정 연결 및 대표 이메일 생략', () => {
  const sys = new MockLinkerXStaffSystem();
  const staff = sys.staffList.get('no1dmkr')[0]; // 김동명 과장 (staff_001)

  // 1) 초기 상태: 계정 미연결
  assert.equal(staff.accountStatus, 'unlinked');
  assert.equal(staff.linkedUid, null);

  // 2) 관리자가 직원 이메일로 초대장 발송
  const invRes = sys.createStaffInvitation('admin_uid', 'no1dmkr', staff.id, 'dongmyeong.kim@gmail.com');
  assert.equal(invRes.ok, true);
  assert.equal(staff.accountStatus, 'invited');
  assert.equal(staff.invitationEmail, 'dongmyeong.kim@gmail.com');

  // 3) 직원이 본인 이메일로 인증 후 초대 수락 (대표 이메일 재입력 단계 생략)
  const userUid = 'uid_kim_google';
  const acceptRes = sys.acceptInvitation(userUid, 'dongmyeong.kim@gmail.com', invRes.invitationId);
  assert.equal(acceptRes.ok, true);

  // 4) 직원 카드와 UID 연결 및 권한 확인
  assert.equal(staff.accountStatus, 'linked');
  assert.equal(staff.linkedUid, userUid);
  assert.equal(staff.linkedEmail, 'dongmyeong.kim@gmail.com');
  assert.equal(sys.hasWorkspaceAccess(userUid, 'no1dmkr'), true);

  // 5) 기존 업무 기록과의 staffId 연결 관계가 영구 유지됨 확인
  const kimRecords = sys.businessRecords.filter(r => r.staffId === staff.id);
  assert.equal(kimRecords.length, 2);
  assert.equal(kimRecords[0].staffName, '김동명');
});

test('2. 직원의 직접 요청: 로그인 화면에서 대표 이메일로 요청 -> 관리자 연결 대기 -> 관리자 연결', () => {
  const sys = new MockLinkerXStaffSystem();
  const userUid = 'uid_lee_direct';
  const userEmail = 'susan.lee@gmail.com';

  // 1) 직원이 대표 이메일로 직접 연결 요청
  const reqRes = sys.requestStaffConnection(userUid, userEmail, 'ceo@dongmyeong.com');
  assert.equal(reqRes.ok, true);
  assert.equal(reqRes.companyId, 'no1dmkr');
  assert.equal(reqRes.status, 'pending');

  // 아직 관리자가 승인/연결하지 않았으므로 워크스페이스 접근 차단
  assert.equal(sys.hasWorkspaceAccess(userUid, 'no1dmkr'), false);

  // 2) 관리자가 요청 확인 후 기존 직원(이수산 대리, staff_002) 카드에 명시적 연결
  const targetStaff = sys.staffList.get('no1dmkr')[1]; // 이수산 대리
  assert.equal(targetStaff.accountStatus, 'unlinked');

  const connectRes = sys.connectStaffAccount('admin_uid', 'no1dmkr', targetStaff.id, userUid, userEmail);
  assert.equal(connectRes.ok, true);

  // 3) 연결 완료 후 직원 카드 상태 및 워크스페이스 업무 진입 가능 확인
  assert.equal(targetStaff.accountStatus, 'linked');
  assert.equal(targetStaff.linkedUid, userUid);
  assert.equal(targetStaff.linkedEmail, userEmail);
  assert.equal(sys.hasWorkspaceAccess(userUid, 'no1dmkr'), true);
});

test('3. 미등록 신입 직원 등록 후 연결: 직접 요청 후 관리자가 신규 등록 화면에서 등록 후 연결', () => {
  const sys = new MockLinkerXStaffSystem();
  const newStaffUid = 'uid_park_newbie';
  const newStaffEmail = 'newbie.park@company.com';

  // 1) 신입 직원이 대표 이메일로 연결 요청
  const reqRes = sys.requestStaffConnection(newStaffUid, newStaffEmail, 'ceo@dongmyeong.com');
  assert.equal(reqRes.status, 'pending');

  // 2) 관리자가 '직원 등록 후 연결' 선택 -> 이름, 직책, 창고, 권한 등록 후 즉시 연결
  const newStaffData = {
    userId: 'dm_park',
    name: '박신입',
    jobTitle: '주임',
    warehouse: '부산본점창고',
    phone: '010-9999-8888',
    permissions: { orders: true, loading: false }
  };
  const regRes = sys.registerStaffAndConnect('admin_uid', 'no1dmkr', newStaffData, newStaffUid, newStaffEmail);
  assert.equal(regRes.ok, true);

  // 3) 신규 생성된 카드와 연결 확인
  const createdStaff = sys.staffList.get('no1dmkr').find(s => s.id === regRes.staffId);
  assert.ok(createdStaff);
  assert.equal(createdStaff.name, '박신입');
  assert.equal(createdStaff.accountStatus, 'linked');
  assert.equal(createdStaff.linkedUid, newStaffUid);
  assert.equal(createdStaff.linkedEmail, newStaffEmail);
  assert.equal(sys.hasWorkspaceAccess(newStaffUid, 'no1dmkr'), true);
});

test('4. 두 경로가 겹치는 경우: 직접 요청 후 초대 수락 시 중복 없이 1회만 연결 & 타 계정 덮어쓰기 원천 차단', () => {
  const sys = new MockLinkerXStaffSystem();
  const staff = sys.staffList.get('no1dmkr')[0]; // staff_001
  const userUid = 'uid_overlap_user';
  const userEmail = 'overlap.user@gmail.com';

  // 1) 직원이 직접 요청을 보냄
  sys.requestStaffConnection(userUid, userEmail, 'ceo@dongmyeong.com');

  // 2) 관리자도 동시에 초대를 발송함
  const invRes = sys.createStaffInvitation('admin_uid', 'no1dmkr', staff.id, userEmail);

  // 3) 직원이 초대를 수락함 -> 둘 다 처리되어도 멤버십 및 카드는 1개만 생성 (멱등성 보장)
  const acceptRes = sys.acceptInvitation(userUid, userEmail, invRes.invitationId);
  assert.equal(acceptRes.ok, true);
  assert.equal(staff.accountStatus, 'linked');
  assert.equal(staff.linkedUid, userUid);

  // 4) 관리자가 거의 동시에 직접 요청을 다시 승인하더라도 멱등하게 처리됨
  const dupConnectRes = sys.connectStaffAccount('admin_uid', 'no1dmkr', staff.id, userUid, userEmail);
  assert.equal(dupConnectRes.ok, true);
  assert.equal(staff.linkedUid, userUid);

  // 5) 이미 다른 계정(userUid)에 연결된 카드에 제3자가 연결을 시도하는 경우 원천 차단
  const hackerUid = 'uid_intruder';
  const hackerEmail = 'intruder@evil.com';
  assert.throws(() => {
    sys.connectStaffAccount('admin_uid', 'no1dmkr', staff.id, hackerUid, hackerEmail);
  }, /이미 다른 계정.*에 연결된 직원 카드입니다/);

  assert.throws(() => {
    sys.createStaffInvitation('admin_uid', 'no1dmkr', staff.id, hackerEmail);
  }, /이미 다른 계정.*에 연결된 직원 카드입니다/);
});

test('5. 퇴사 후 접근 해제: 퇴사 처리 시 회사 접근 권한 즉시 차단 & 과거 상차·전표 업무 기록 보존', () => {
  const sys = new MockLinkerXStaffSystem();
  const staff = sys.staffList.get('no1dmkr')[0]; // 김동명 과장 (staff_001)
  const userUid = 'uid_kim_retire';
  const userEmail = 'kim.retire@gmail.com';

  // 1) 정상 연결 상태
  const invRes = sys.createStaffInvitation('admin_uid', 'no1dmkr', staff.id, userEmail);
  sys.acceptInvitation(userUid, userEmail, invRes.invitationId);
  assert.equal(sys.hasWorkspaceAccess(userUid, 'no1dmkr'), true);

  // 2) 관리자가 퇴사 처리 실행
  const resignRes = sys.resignStaff('admin_uid', 'no1dmkr', staff.id);
  assert.equal(resignRes.ok, true);

  // 3) 해당 계정의 회사 시스템 접근 권한은 즉시 차단됨
  assert.equal(sys.hasWorkspaceAccess(userUid, 'no1dmkr'), false);
  assert.equal(staff.accountStatus, 'unlinked');
  assert.equal(staff.linkedUid, null);
  assert.equal(staff.resigned, true);

  // 4) 퇴사 후에도 기존 상차·전표 등 과거 업무 기록은 직원 ID 및 이름과 함께 영구 보존됨
  const historicRecords = sys.businessRecords.filter(r => r.staffId === staff.id);
  assert.equal(historicRecords.length, 2);
  assert.equal(historicRecords[0].staffId, 'staff_001');
  assert.equal(historicRecords[0].staffName, '김동명');
  assert.equal(historicRecords[1].staffId, 'staff_001');
  assert.equal(historicRecords[1].staffName, '김동명');
});
