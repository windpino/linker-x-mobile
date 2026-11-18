import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const directory = existsSync('src/desktop/components') ? 'src/desktop/components' : 'src/components';
test('legacy signup entry uses Firebase approval gate without a client-generated verification code', () => {
  const source = readFileSync(`${directory}/AgencySignup.jsx`, 'utf8');
  assert.match(source, /AuthGate/);
  assert.doesNotMatch(source, /emailjs|verificationCode|onSignup\s*\(/);
});
test('company bootstrap components do not create fixed plaintext credentials', () => {
  for (const name of ['Onboarding', 'SuperAdmin']) {
    const source = readFileSync(`${directory}/${name}.jsx`, 'utf8');
    assert.doesNotMatch(source, /password\s*:\s*(?:['"]123456['"]|agencyForm\.password)/);
  }
});
