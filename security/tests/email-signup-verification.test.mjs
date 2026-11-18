import { test } from 'node:test';
import assert from 'node:assert/strict';

test('Email format and password match validation logic', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert.equal(emailRegex.test('windpino@gmail.com'), true);
  assert.equal(emailRegex.test('invalid-email'), false);
  assert.equal(emailRegex.test('user@domain'), false);

  const validateSignup = (email, password, passwordConfirm) => {
    if (!email || !emailRegex.test(email.trim())) return { ok: false, error: 'invalid-email' };
    if (!password || password.length < 6) return { ok: false, error: 'weak-password' };
    if (password !== passwordConfirm) return { ok: false, error: 'password-mismatch' };
    return { ok: true };
  };

  assert.deepEqual(validateSignup('windpino@gmail.com', 'password123', 'different'), { ok: false, error: 'password-mismatch' });
  assert.deepEqual(validateSignup('windpino@gmail.com', '123', '123'), { ok: false, error: 'weak-password' });
  assert.deepEqual(validateSignup('bademail', 'password123', 'password123'), { ok: false, error: 'invalid-email' });
  assert.deepEqual(validateSignup('windpino@gmail.com', 'ValidPass123!', 'ValidPass123!'), { ok: true });
});

test('Sanitization prevents password and credential caching', async () => {
  const { withoutSecrets } = await import('../../src/auth/sanitize.js');
  const userPayload = {
    email: 'windpino@gmail.com',
    password: 'superSecretPassword123!',
    passwordConfirm: 'superSecretPassword123!',
    companyId: 'dongmyeong',
    name: '대표자'
  };
  const sanitized = withoutSecrets(userPayload);
  assert.equal(sanitized.email, 'windpino@gmail.com');
  assert.equal(sanitized.companyId, 'dongmyeong');
  assert.equal(sanitized.password, undefined);
  assert.equal(sanitized.passwordConfirm, undefined);
});

test('Production Auth Verification isolation guarantees', () => {
  // Simulate environment flags
  const simulateEnv = (prodApproved, prodAuthVerification) => {
    const isProdApproved = prodApproved === 'true';
    const isProdAuthVerification = prodAuthVerification === 'true';
    const useAuthEmulator = !isProdApproved && !isProdAuthVerification;
    const useFirestoreEmulator = !isProdApproved;
    const authTargetMode = isProdApproved
      ? 'production'
      : isProdAuthVerification
        ? 'production-auth-only'
        : 'emulator';
    return { useAuthEmulator, useFirestoreEmulator, authTargetMode };
  };

  // 1. Default dev/CI mode
  const devMode = simulateEnv('false', 'false');
  assert.equal(devMode.useAuthEmulator, true, 'Default dev must use Auth emulator');
  assert.equal(devMode.useFirestoreEmulator, true, 'Default dev must use Firestore emulator');
  assert.equal(devMode.authTargetMode, 'emulator');

  // 2. Dedicated Production Auth Verification mode (VITE_PROD_AUTH_VERIFICATION=true)
  const verifyMode = simulateEnv('false', 'true');
  assert.equal(verifyMode.useAuthEmulator, false, 'Auth must NOT use emulator in verification mode');
  assert.equal(verifyMode.useFirestoreEmulator, true, 'Firestore MUST stay in emulator to protect production data');
  assert.equal(verifyMode.authTargetMode, 'production-auth-only');

  // 3. Full production approved (requires explicit approval)
  const prodMode = simulateEnv('true', 'false');
  assert.equal(prodMode.useAuthEmulator, false);
  assert.equal(prodMode.useFirestoreEmulator, false);
  assert.equal(prodMode.authTargetMode, 'production');
});

test('Awaiting Email Verification and Awaiting Company Approval state progression', () => {
  const evaluateUserState = (user, session) => {
    if (!user) return 'unauthenticated';
    if (!user.emailVerified) return 'awaiting_email_verification';
    if (!session) return 'awaiting_company_approval';
    return 'approved_session';
  };

  assert.equal(evaluateUserState(null, null), 'unauthenticated');
  assert.equal(evaluateUserState({ email: 'windpino@gmail.com', emailVerified: false }, null), 'awaiting_email_verification');
  assert.equal(evaluateUserState({ email: 'windpino@gmail.com', emailVerified: true }, null), 'awaiting_company_approval');
  assert.equal(evaluateUserState({ email: 'windpino@gmail.com', emailVerified: true }, { companyId: 'dongmyeong', authRole: 'tenant_admin' }), 'approved_session');
});
