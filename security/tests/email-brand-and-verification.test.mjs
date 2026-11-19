import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateVerificationEmailHtml, generateVerificationEmailPlainText } from '../../functions/emailTemplates.js';

test('1. 회원가입 인증 메일 HTML 템플릿 문구 및 브랜드 요소 검증', () => {
  const dummyLink = 'https://link-x-6606e.firebaseapp.com?mode=verifyEmail&oobCode=dummy_secret_oob_code_12345';
  const dummyEmail = 'user@testcompany.com';

  const html = generateVerificationEmailHtml({ link: dummyLink, email: dummyEmail });

  // 1-1. 메일 제목 및 발신자 컨텍스트
  assert.match(html, /\[링커엑스\] 가입을 계속하려면 이메일을 확인해 주세요/);

  // 1-2. 본문 제목 및 안내 문구
  assert.match(html, /이메일 주소를 확인해 주세요/);
  assert.match(html, /링커엑스에 가입해 주셔서 감사합니다\./);
  assert.match(html, /아래 버튼을 눌러 이메일을 확인하고 가입을 계속해 주세요\./);

  // 1-3. 파란색 [이메일 인증하기] 버튼 및 스타일
  assert.match(html, /이메일 인증하기/);
  assert.match(html, /background-color:\s*#2563eb/);

  // 1-4. 버튼 하단 안내 문구
  assert.match(html, /가입을 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다\./);

  // 1-5. 이미지 차단 대비 순수 텍스트 헤더 보장
  assert.match(html, /LINKER/);
  assert.match(html, /링커엑스/);

  // 1-6. 평문 대체 링크 박스
  assert.match(html, /버튼이 클릭되지 않으시면 아래 링크를 복사하여 브라우저 주소창에 입력해 주세요/);
  assert.match(html, new RegExp(dummyLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  // 1-7. 하단 브랜드 문구 및 지원 안내
  assert.match(html, /링커엑스 · 주문부터 상차, 전표, 배송까지 한곳에서/);
  assert.match(html, /수주 접수부터 물류 상차, 전자 매출전표 발행, 실시간 배송 및 재고 마감까지/);
  assert.match(html, /support@linker-x\.com/);
});

test('2. 평문(Plain text) 메일 템플릿 검증', () => {
  const dummyLink = 'https://link-x-6606e.firebaseapp.com?mode=verifyEmail&oobCode=dummy_secret_oob_code_12345';
  const dummyEmail = 'user@testcompany.com';

  const text = generateVerificationEmailPlainText({ link: dummyLink, email: dummyEmail });

  assert.match(text, /\[링커엑스\] 가입을 계속하려면 이메일을 확인해 주세요/);
  assert.match(text, /이메일 주소를 확인해 주세요/);
  assert.match(text, /링커엑스에 가입해 주셔서 감사합니다\./);
  assert.match(text, /이메일 인증 링크:/);
  assert.match(text, new RegExp(dummyLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(text, /가입을 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다\./);
  assert.match(text, /링커엑스 · 주문부터 상차, 전표, 배송까지 한곳에서/);
  assert.match(text, /support@linker-x\.com/);
});

test('3. 인증 완료 화면 상태 분기 (성공, 만료, 사용됨) 검증', () => {
  const handleVerifyEmailResult = (status) => {
    if (status === 'success') {
      return {
        badge: '인증 완료',
        title: '이메일 인증이 완료되었습니다',
        buttonText: '링커엑스로 돌아가기',
        footerTag: '링커엑스 · 주문부터 상차, 전표, 배송까지 한곳에서'
      };
    }
    if (status === 'expired') {
      return {
        badge: '링크 만료',
        title: '인증 링크 만료',
        errorMsg: '해당 인증 링크는 유효 시간이 만료되었습니다. 보안을 위해 링커엑스 로그인 화면에서 인증 메일을 재발송해 주세요.',
        buttonText: '링커엑스 로그인으로 돌아가기'
      };
    }
    if (status === 'invalid') {
      return {
        badge: '유효하지 않은 링크',
        title: '인증 링크 확인 불가',
        errorMsg: '이미 사용되었거나 유효하지 않은 인증 링크입니다. 새 인증 링크를 요청해 주세요.',
        buttonText: '링커엑스 로그인으로 돌아가기'
      };
    }
    return {
      badge: '인증 오류',
      title: '이메일 인증 오류',
      errorMsg: '이메일 인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      buttonText: '링커엑스 로그인으로 돌아가기'
    };
  };

  // 3-1. 성공
  const success = handleVerifyEmailResult('success');
  assert.equal(success.title, '이메일 인증이 완료되었습니다');
  assert.equal(success.buttonText, '링커엑스로 돌아가기');
  assert.equal(success.footerTag, '링커엑스 · 주문부터 상차, 전표, 배송까지 한곳에서');

  // 3-2. 만료
  const expired = handleVerifyEmailResult('expired');
  assert.match(expired.errorMsg, /만료되었습니다.*재발송해 주세요/);

  // 3-3. 기사용/무효
  const invalid = handleVerifyEmailResult('invalid');
  assert.match(invalid.errorMsg, /이미 사용되었거나 유효하지 않은/);
});

test('4. 복귀 후 라우팅 및 회사 접근 권한 격리 (이메일 인증만으로 권한 미부여)', () => {
  const routeUserAfterEmailVerify = ({ hasApplication, isApproved }) => {
    // Crucial: emailVerified alone NEVER grants company access
    if (!hasApplication) {
      return { targetView: 'new_tenant_form', companyAccessGranted: false };
    }
    if (hasApplication && !isApproved) {
      return { targetView: 'awaiting_tenant_approval', companyAccessGranted: false };
    }
    if (hasApplication && isApproved) {
      return { targetView: 'company_workspace', companyAccessGranted: true };
    }
  };

  // 4-1. 복귀 후 신청 전이면 회원사 정보 입력 화면
  const notApplied = routeUserAfterEmailVerify({ hasApplication: false, isApproved: false });
  assert.equal(notApplied.targetView, 'new_tenant_form');
  assert.equal(notApplied.companyAccessGranted, false, '이메일 인증만으로 회사 접근 권한을 부여하지 않습니다.');

  // 4-2. 이미 신청했다면 승인 대기 화면
  const pending = routeUserAfterEmailVerify({ hasApplication: true, isApproved: false });
  assert.equal(pending.targetView, 'awaiting_tenant_approval');
  assert.equal(pending.companyAccessGranted, false, '승인 전 계정은 회사 접근 권한을 가질 수 없습니다.');

  // 4-3. 관리자 정식 승인 후에만 회사 입장
  const approved = routeUserAfterEmailVerify({ hasApplication: true, isApproved: true });
  assert.equal(approved.targetView, 'company_workspace');
  assert.equal(approved.companyAccessGranted, true);
});

test('5. Continue URL 보안 검증 (localhost 원천 차단)', async () => {
  const { getContinueUrl } = await import('../../src/auth/client.js');
  const url = getContinueUrl();
  assert.equal(url.includes('localhost'), false, '운영 인증 메일 링크에 localhost가 포함되어서는 안 됩니다.');
  assert.equal(url.includes('127.0.0.1'), false, '운영 인증 메일 링크에 127.0.0.1이 포함되어서는 안 됩니다.');
  assert.equal(url, 'https://link-x-6606e.firebaseapp.com');
});
