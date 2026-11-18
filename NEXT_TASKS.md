# Linker X Mobile — Next Tasks

Status values: TODO, IN PROGRESS, BLOCKED, DONE. Do not mark DONE without test evidence.

## P0 — Data safety
- [ ] Identify all inventory writes from mobile and desktop. Inventory is shared with production.
- [ ] Test concurrent loading using Firebase emulator or isolated test project, not live inventory.
- [ ] Replace stale whole-inventory writes with concurrency-safe, atomic stock changes and unique operation IDs.
- [ ] Ensure loading cancellations are applied once, only when the matching original event exists.
- [ ] Verify invoice save confirms the server commit before reporting success. Test retries and duplicate prevention.

## P1 — Offline loading
- [ ] Design a durable IndexedDB queue for loading events: company, order, item, quantity, operator, operation ID, recorded-at time.
- [ ] On reconnect, reconcile events against authoritative server stock with idempotency and conflict reporting.
- [ ] Show connection/sync status: red offline, amber pending/syncing, blue online and confirmed.
- [ ] Show last synchronized stock timestamp while offline; never label cached stock as real-time.
- [ ] Test close/reopen, reconnect, retries, two-device edits, insufficient stock, and audit trail.

## P2 — Mobile UI
- [ ] Review ordering, loading, invoice screens for wrapping, overflow, button size, touch targets and navigation.
- [ ] Review staff and admin menus, preserving roles and authorization enforcement.
- [ ] Keep delivery sequence flexible for other companies.

## Collaboration protocol
At the start of an Antigravity development session read AGENTS.md, WORK_LOG.md, and NEXT_TASKS.md. At the end, update WORK_LOG.md with actual branch/commit, changes, tests and outcomes; update task status here. Push changes for review. ChatGPT will not automatically know that a task finished without rereading GitHub or a separately configured automation.

Created: 2026-11-16.


## Firebase Auth / 공개 Rules 긴급 대응 — 2026-11-16
- DONE (개발): feature/firebase-auth 이메일/Google 인증, 이메일 확인·재설정, 서버 UID 소속 승인 경계, 규칙 후보 및 두 저장소 Emulator 19/19.
- BLOCKED (운영): 공개 Rules가 유지되고 있음. emergency-deny.rules 게시에는 업무 중단 및 별도 승인 필요.
- TODO: 기존 bundles/metadata/설정 경로 최소 권한 매핑, 평문 비밀번호 데이터 정리 계획 승인, 거래처 요청→기존 수주 연동.
- TODO: Antigravity 재고 브랜치와 별도 통합 브랜치에서 인증/동시 상차/취소/재시도/전표/오프라인 테스트. 현재 P0 재고 과제의 완료 상태는 변경하지 않음.
- TODO: 실제 메일 수신·Google 팝업/리디렉션·Functions HTTP/CORS, 플랫폼 최초 UID 등록, 운영 전환/배포 별도 승인.


## 2026-11-16 인증 서버 연결 통합
운영 전체 거부 유지. tenantRead/tenantWrite, 회사별 캐시 경계, 실제 재고 서비스 원본 통합 테스트 추가. 재고/상차/전표 함수 변경 없음. 전환 차단 조건과 후속 테스트는 security/DEPLOYMENT_BLOCKERS.ko.md 참조. 운영 배포·main 병합·계정/결제 변경 미실행.
