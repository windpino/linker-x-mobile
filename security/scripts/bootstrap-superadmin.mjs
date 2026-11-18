#!/usr/bin/env node
/**
 * Linker X Platform Superadmin Provisioning Script
 * 
 * Usage:
 *   node security/scripts/bootstrap-superadmin.mjs grant <uid> [email] [--emulator]
 *   node security/scripts/bootstrap-superadmin.mjs revoke <uid> [--emulator]
 *   node security/scripts/bootstrap-superadmin.mjs status <uid> [--emulator]
 * 
 * Safety:
 *   - Superadmin permissions are strictly tied to Firebase Auth UID, NEVER hardcoded email.
 *   - Only writes to platformAccess/{uid} in Firestore.
 *   - Requires explicit operator action. Normal users cannot self-register as superadmin.
 */

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'link-x-6606e';
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

const args = process.argv.slice(2);
const command = args[0];
const targetUid = args[1];
const targetEmail = args[2] && !args[2].startsWith('--') ? args[2] : null;
const useEmulator = args.includes('--emulator') || Boolean(process.env.FIRESTORE_EMULATOR_HOST);

function printUsage() {
  console.log(`
Linker X Superadmin Provisioning Tool

Usage:
  node security/scripts/bootstrap-superadmin.mjs grant <uid> [email] [--emulator]
  node security/scripts/bootstrap-superadmin.mjs revoke <uid> [--emulator]
  node security/scripts/bootstrap-superadmin.mjs status <uid> [--emulator]

Examples:
  # Grant superadmin in emulator:
  node security/scripts/bootstrap-superadmin.mjs grant abc123Uid windpino@gmail.com --emulator

  # Check status:
  node security/scripts/bootstrap-superadmin.mjs status abc123Uid --emulator

  # Revoke superadmin:
  node security/scripts/bootstrap-superadmin.mjs revoke abc123Uid --emulator
`);
}

if (!command || !targetUid || !['grant', 'revoke', 'status'].includes(command)) {
  printUsage();
  process.exit(1);
}

function getBaseUrl() {
  if (useEmulator) {
    return `http://${EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  }
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      fields[k] = { stringValue: v };
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v };
    } else if (typeof v === 'number') {
      fields[k] = { integerValue: String(v) };
    } else if (v instanceof Date) {
      fields[k] = { timestampValue: v.toISOString() };
    } else if (v === null) {
      fields[k] = { nullValue: null };
    }
  }
  return fields;
}

function fromFirestoreFields(fields = {}) {
  const res = {};
  for (const [k, v] of Object.entries(fields)) {
    if ('stringValue' in v) res[k] = v.stringValue;
    else if ('booleanValue' in v) res[k] = v.booleanValue;
    else if ('integerValue' in v) res[k] = Number(v.integerValue);
    else if ('timestampValue' in v) res[k] = v.timestampValue;
    else if ('nullValue' in v) res[k] = null;
  }
  return res;
}

async function run() {
  const docUrl = `${getBaseUrl()}/platformAccess/${encodeURIComponent(targetUid)}`;
  const headers = { 'Content-Type': 'application/json' };

  if (!useEmulator) {
    const token = process.env.GOOGLE_OAUTH_TOKEN || process.env.FIREBASE_TOKEN;
    if (!token) {
      console.error('\n[오류] 운영 환경(Production) Firestore 쓰기는 별도 승인 및 GOOGLE_OAUTH_TOKEN / FIREBASE_TOKEN 인증이 필요합니다.');
      console.log('\n수동 적용 가이드 (Google Cloud Console / gcloud CLI):');
      console.log('----------------------------------------------------');
      console.log(`대상 프로젝트: ${PROJECT_ID}`);
      console.log(`문서 경로: platformAccess/${targetUid}`);
      if (command === 'grant') {
        console.log(`문서 필드:
  - status: "active" (string)
  - role: "platform_admin" (string)
  - email: "${targetEmail || 'windpino@gmail.com'}" (string)
  - createdAt: "${new Date().toISOString()}" (timestamp)
  - grantedBy: "bootstrap_operator" (string)
`);
        console.log(`gcloud CLI 명령:
gcloud firestore documents create "projects/${PROJECT_ID}/databases/(default)/documents/platformAccess/${targetUid}" \\
  --data="status=active,role=platform_admin,email=${targetEmail || 'windpino@gmail.com'},grantedBy=bootstrap_operator"
`);
      } else if (command === 'revoke') {
        console.log(`gcloud CLI 명령:
gcloud firestore documents update "projects/${PROJECT_ID}/databases/(default)/documents/platformAccess/${targetUid}" \\
  --data="status=revoked,updatedAt=${new Date().toISOString()}"
`);
      }
      process.exit(1);
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    if (command === 'status') {
      const res = await fetch(docUrl, { headers });
      if (res.status === 404) {
        console.log(`[상태] UID "${targetUid}": 등록된 플랫폼 관리자 권한이 없습니다 (문서 없음).`);
        return;
      }
      const json = await res.json();
      const parsed = fromFirestoreFields(json.fields);
      console.log(`[상태] UID "${targetUid}":`);
      console.log(JSON.stringify(parsed, null, 2));
      return;
    }

    if (command === 'grant') {
      const payload = {
        fields: toFirestoreFields({
          uid: targetUid,
          status: 'active',
          role: 'platform_admin',
          email: targetEmail || '',
          grantedBy: 'bootstrap_operator',
          updatedAt: new Date().toISOString()
        })
      };

      const res = await fetch(`${docUrl}?updateMask.fieldPaths=status&updateMask.fieldPaths=role&updateMask.fieldPaths=email&updateMask.fieldPaths=grantedBy&updateMask.fieldPaths=updatedAt`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      console.log(`\n[성공] UID "${targetUid}"에게 플랫폼 슈퍼관리자(platform_admin) 권한을 부여했습니다.`);
      console.log(`문서: platformAccess/${targetUid}`);
      console.log(`상태: active`);
      console.log(`이메일: ${targetEmail || '(미지정)'}`);
      return;
    }

    if (command === 'revoke') {
      const payload = {
        fields: toFirestoreFields({
          status: 'revoked',
          updatedAt: new Date().toISOString()
        })
      };

      const res = await fetch(`${docUrl}?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      console.log(`\n[회수 완료] UID "${targetUid}"의 플랫폼 관리자 권한을 회수했습니다 (status: revoked).`);
      return;
    }
  } catch (err) {
    console.error(`[오류 발생]`, err.message);
    process.exit(1);
  }
}

run();
