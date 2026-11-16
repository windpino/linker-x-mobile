# Linker X Mobile — Shared Work Log

## 2026-11-16 — ChatGPT initial read-only audit and handoff setup
Status: code reviewed in GitHub, production UI/browser not exercised; no business data changed; no application code modified.

Repository inspected: windpino/linker-x-mobile.
- src/firebase.js: Firestore persistentLocalCache with persistentMultipleTabManager configured; this alone does NOT establish a complete safe offline loading queue.
- src/utils/idbBundleCache.js: generic IndexedDB bundle cache exists.
- src/components/OrderList.jsx: loading toggle invokes onMoveStock / onRevertAutoMoveStock and separately onUpdateOrder; local processedItems and stockOverrides provide optimistic display/session caching.
- src/App.jsx: onMoveStock uses inventory snapshot and setDoc for the complete inventory value, then writes movement history separately. Concurrent updates may overwrite one another; needs isolated tests.
- src/App.jsx: onRevertAutoMoveStock adjusts inventory before finding matching movement history; duplicate reversal / missing history requires guarding.
- src/App.jsx: handleSaveSalesInvoice uses Firestore batch for invoice, stock and (when applicable) order changes, but UI state is updated before an asynchronously deferred batch.commit(); commit failures are logged rather than shown to the user. Distinguish this from a completed server save.
- Review hypothesis: cross-device concurrency, mid-operation network loss, repeat taps, reversal, invoice retry and reconnect can cause inconsistencies; not yet confirmed by an end-to-end live test.

Caution on prior discussion: a concurrent inventory lost-update scenario was described as a conceptual/simulated outcome, NOT verified as a real production failure. Do not report live transaction testing as complete.

Next handoff: Antigravity should read AGENTS.md + NEXT_TASKS.md and verify these findings against current code, then implement/test in a non-production isolated environment. Record every actual change and test here.

## Log entry template
### YYYY-MM-DD — Actor — task
- Status:
- Branch / commit:
- Files changed:
- Checks actually run and results:
- Production data touched?:
- Outstanding risks and next action:


## 2026-11-16 — Firebase Auth 및 공개 규칙 긴급 대응 개발
- Branch: feature/firebase-auth (이 항목을 포함한 GitHub 커밋 참조). 운영 main 병합/배포 없음.
- Status: 개발 인증/권한 경계 구현 및 양 저장소 Emulator 19/19 통과. 기존 ERP 번들·설정/거래처 수주 연동과 실제 Functions HTTP·메일 수신·Google 팝업 테스트는 미완료. 운영 전환 BLOCKED.
- 변경 파일/범위/테스트/한계: security/RESULTS.ko.md, security/DEPLOYMENT_BLOCKERS.ko.md, security/evidence/.
- Auth 기본 설정만 운영에서 승인 범위대로 적용. 운영 Rules/계정/데이터 마이그레이션 미실행. 도메인 확인 시 기존 세션 자동 복원으로 업무 화면이 표시된 조사 한계를 RESULTS에 명시.
- 보호: 재고·상차·주문·납품·전표 관련 함수 본문 100개 원문 동일. 모바일 재고 브랜치 App.jsx 텍스트 병합 모의 검사 0 conflict. 실제 통합 테스트 미완료.
- 기본 개발 연결은 demo-linker-auth Emulator. 실운영 Rules와 계정 매핑/마이그레이션/배포는 각각 별도 승인 필요.


## 2026-11-16 인증 서버 연결 통합
운영 전체 거부 유지. tenantRead/tenantWrite, 회사별 캐시 경계, 실제 재고 서비스 원본 통합 테스트 추가. 재고/상차/전표 함수 변경 없음. 전환 차단 조건과 후속 테스트는 security/DEPLOYMENT_BLOCKERS.ko.md 참조. 운영 배포·main 병합·계정/결제 변경 미실행.
