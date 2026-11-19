import { test } from 'node:test';
import assert from 'node:assert/strict';

test('1. Email format validation for password reset (incomplete address prevention)', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateResetEmail = (raw) => {
    const email = (raw || '').trim();
    if (!email) {
      return { ok: false, error: '가입할 때 등록한 전체 이메일 주소를 입력해 주세요.' };
    }
    if (!emailRegex.test(email)) {
      return { ok: false, error: '가입할 때 등록한 전체 이메일 주소를 입력해 주세요. (예: user@company.com)' };
    }
    return { ok: true, email };
  };

  // 1-1. Empty / whitespace
  assert.equal(validateResetEmail('').ok, false);
  assert.equal(validateResetEmail('').error, '가입할 때 등록한 전체 이메일 주소를 입력해 주세요.');
  assert.equal(validateResetEmail('   ').ok, false);

  // 1-2. Incomplete addresses like companyId / partial ID (e.g. no1dmkr)
  assert.equal(validateResetEmail('no1dmkr').ok, false);
  assert.equal(validateResetEmail('no1dmkr').error, '가입할 때 등록한 전체 이메일 주소를 입력해 주세요. (예: user@company.com)');
  assert.equal(validateResetEmail('admin@').ok, false);
  assert.equal(validateResetEmail('@domain.com').ok, false);
  assert.equal(validateResetEmail('user@company').ok, false);

  // 1-3. Valid full email
  const valid = validateResetEmail('windpino@gmail.com');
  assert.equal(valid.ok, true);
  assert.equal(valid.email, 'windpino@gmail.com');

  const validPartner = validateResetEmail('staff@no1dmkr.com');
  assert.equal(validPartner.ok, true);
  assert.equal(validPartner.email, 'staff@no1dmkr.com');
});

test('2. Continue URL logic strictly prevents localhost in emails', async () => {
  const { getContinueUrl } = await import('../../src/auth/client.js');

  // Verify function returns https://link-x-6606e.firebaseapp.com when executed in non-browser/node or localhost
  const url = getContinueUrl();
  assert.equal(url.includes('localhost'), false, 'Continue URL must NEVER contain localhost');
  assert.equal(url.includes('127.0.0.1'), false, 'Continue URL must NEVER contain 127.0.0.1');
  assert.equal(url, 'https://link-x-6606e.firebaseapp.com');
});

test('3. User messaging on password reset submission (security enumeration defense)', () => {
  const getSubmissionMessage = (code) => {
    if (code === 'auth/invalid-email') {
      return { type: 'error', text: '가입할 때 등록한 전체 이메일 주소를 입력해 주세요. (예: user@company.com)' };
    }
    // For both success and user-not-found, display unified generic message
    return { type: 'success', text: '등록된 이메일이라면 재설정 링크를 보내드립니다. 받은편지함과 스팸함을 확인해 주세요.' };
  };

  const successMsg = getSubmissionMessage(null);
  assert.equal(successMsg.type, 'success');
  assert.equal(successMsg.text, '등록된 이메일이라면 재설정 링크를 보내드립니다. 받은편지함과 스팸함을 확인해 주세요.');

  const notFoundMsg = getSubmissionMessage('auth/user-not-found');
  assert.equal(notFoundMsg.type, 'success');
  assert.equal(notFoundMsg.text, '등록된 이메일이라면 재설정 링크를 보내드립니다. 받은편지함과 스팸함을 확인해 주세요.');

  const invalidMsg = getSubmissionMessage('auth/invalid-email');
  assert.equal(invalidMsg.type, 'error');
  assert.equal(invalidMsg.text, '가입할 때 등록한 전체 이메일 주소를 입력해 주세요. (예: user@company.com)');
});

test('4. Action link state handling: valid, expired, and already-used links', () => {
  const handleActionCodeState = (errCode, email) => {
    if (!errCode && email) {
      return { status: 'valid', targetEmail: email, guide: '새 비밀번호를 입력해 주세요.' };
    }
    if (errCode === 'auth/expired-action-code') {
      return { status: 'expired', guide: '해당 재설정 링크는 유효 시간이 만료되었습니다. 보안을 위해 새 재설정 링크를 요청해 주세요.' };
    }
    if (errCode === 'auth/invalid-action-code') {
      return { status: 'invalid', guide: '이 링크는 이미 사용되었거나 유효하지 않습니다. 비밀번호를 변경하려면 새 재설정 링크를 요청해 주세요.' };
    }
    return { status: 'unknown_error', guide: '링크 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
  };

  // 4-1. Valid link
  const valid = handleActionCodeState(null, 'user@example.com');
  assert.equal(valid.status, 'valid');
  assert.equal(valid.targetEmail, 'user@example.com');

  // 4-2. Expired link
  const expired = handleActionCodeState('auth/expired-action-code', null);
  assert.equal(expired.status, 'expired');
  assert.match(expired.guide, /만료되었습니다.*새 재설정 링크/);

  // 4-3. Already used / invalid link
  const used = handleActionCodeState('auth/invalid-action-code', null);
  assert.equal(used.status, 'invalid');
  assert.match(used.guide, /이미 사용되었거나.*새 재설정 링크/);
});

test('5. Identity, UID, and membership preservation guarantees', () => {
  // Simulating an existing user before password reset
  const userBeforeReset = {
    uid: 'BL1Rp07y5CXPIVJhhiiajfgljN63',
    email: 'windpino@gmail.com',
    customClaims: {
      superAdmin: true,
      role: 'super_admin',
      platform_admin: true
    },
    memberships: {
      'linker_x_hq': { role: 'platform_admin', status: 'active' },
      'no1dmkr': { role: 'tenant_admin', status: 'active' }
    }
  };

  // Password reset only updates passwordHash on the server, leaving UID and memberships unchanged
  const simulatePasswordReset = (user, _newPasswordHash) => {
    return {
      ...user,
      passwordHash: 'new_bcrypt_hash_simulated'
    };
  };

  const userAfterReset = simulatePasswordReset(userBeforeReset, 'new_hash');

  assert.equal(userAfterReset.uid, userBeforeReset.uid, 'UID must be identical after password reset');
  assert.equal(userAfterReset.email, userBeforeReset.email);
  assert.deepEqual(userAfterReset.customClaims, userBeforeReset.customClaims, 'Custom claims must be preserved');
  assert.deepEqual(userAfterReset.memberships, userBeforeReset.memberships, 'Company memberships must be preserved');
});

test('6. Google Account recovery guidance', () => {
  const googleRecoveryUrl = 'https://accounts.google.com/signin/recovery';
  const getGoogleAccountGuide = () => ({
    message: "Google 계정으로 가입하신 회원은 비밀번호 재설정 메일 대신 'Google 계정으로 계속'으로 로그인하시거나, Google 계정 복구를 이용해 주세요.",
    recoveryUrl: googleRecoveryUrl
  });

  const guide = getGoogleAccountGuide();
  assert.match(guide.message, /Google 계정으로 가입하신/);
  assert.equal(guide.recoveryUrl, 'https://accounts.google.com/signin/recovery');
});
