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

## 2026-11-16 — Antigravity — Emulator Isolation & Concurrency Verification
- Status: COMPLETED (Verified in branch `test/emulator-isolation`)
- Branch / commit: test/emulator-isolation
- Files committed:
  - `.gitignore`: Updated to unignore `scratch/*.mjs`, `scratch/*.log`, `scratch/*.json` (previously `*.mjs` globally blocked committing test scripts).
  - `scratch/test_emulator_isolation.mjs`: Test script for strict local emulator configuration and fail-closed assertion.
  - `scratch/test_emulator_isolation.log`: Raw stdout execution log verifying `connect ECONNREFUSED 127.0.0.1:58088` and fail-closed termination.
  - `scratch/isolated_concurrency_test.mjs`: End-to-end 5-scenario concurrency harness.
  - `scratch/isolated_concurrency_test.log`: Raw stdout execution log for the harness.
  - `scratch/run_concurrency_stress_matrix.mjs`: 100-run (20 iterations x 5 scenarios) stress matrix test suite.
  - `scratch/run_concurrency_stress_matrix.log`: Raw stdout execution log of the matrix suite.
  - `scratch/matrix_results.json`: JSON output of the 100 stress runs.
- Execution Commands and Verification Evidence:
  1. Emulator Isolation & Fail-Closed Test:
     - Command: `node scratch/test_emulator_isolation.mjs | Tee-Object -FilePath "scratch/test_emulator_isolation.log"`
     - Configured Firestore to strict local emulator (`connectFirestoreEmulator` to 127.0.0.1:58088).
     - Verified connection refusal immediately terminates with `connect ECONNREFUSED 127.0.0.1:58088`.
     - Confirmed ZERO traffic routed to production cloud (`link-x-6606e`). Fail-closed behavior validated.
  2. Concurrency Stress Matrix (20 runs each, 100 total simulated tests):
     - Command: `node scratch/run_concurrency_stress_matrix.mjs | Tee-Object -FilePath "scratch/run_concurrency_stress_matrix.log"`
     - Test 1 (Current unpatched code - Monolithic setDoc Concurrency):
       - Before: 본사창고 100
       - Expected after 2 workers load 10 each: 본사창고 80, 차량1 10, 차량2 10
       - Actual: 본사창고 90, 차량1 0, 차량2 10 (Worker 1 update lost)
       - Result: 20/20 runs REPRODUCED Lost Update (100% failure rate on concurrent loads).
     - Test 2 (Current unpatched code - Batch Toggle Overwrite):
       - 5 items (10 units each) batch-toggled in synchronous loop.
       - Expected deduction: 50 (Remaining: 50)
       - Actual deduction: 10 (Remaining: 90; 40 units lost due to stale snapshot in closure).
       - Result: 20/20 runs REPRODUCED Overwrite bug (100% failure rate).
     - Test 3 (Proposed Transaction + Operation ID):
       - 2 concurrent workers writing atomically via runTransaction.
       - Result: 20/20 runs PASSED with exact final stock (80/10/10) and automatic retry on contention.
     - Test 4 (Duplicate Request with identical Operation ID):
       - Simulates network double-tap / retry.
       - Result: 20/20 runs BLOCKED (Idempotent, 0 double-deductions).
     - Test 5 (Revert Idempotency & Ghost Stock Prevention):
       - Valid revert restored stock 90 -> 100.
       - Duplicate revert attempt rejected with INVALID_OR_ALREADY_CANCELLED.
       - Result: 20/20 runs SAFE (0 ghost stock created).
- Production data touched?: NO. Zero network writes to production database.
- Outstanding risks and next action:
  - Production code remains completely untouched as instructed.
  - Production database remains clean.
  - All test scripts and raw execution logs are tracked in Git on `test/emulator-isolation` for complete reproducibility by any reviewer.

## 2026-11-16 — Antigravity — Official Firebase Emulator Suite Execution (120 Runs)
- Status: COMPLETED (Verified against Google Cloud Firestore Emulator v1.22.0)
- Branch / commit: test/emulator-isolation
- Environment Setup:
  - Runtime: Microsoft OpenJDK 21 LTS (`jdk-21.0.13.0.2+1`)
  - Firebase Tools: `firebase-tools@15.36.0` (Local devDependency)
  - Configuration: `firebase.json` (Firestore on 127.0.0.1:8080), `firestore.rules` (open for local emulator)
  - Project Target: `emulator-test-isolated` (Zero connection to production `link-x-6606e`)
- Files committed:
  - `firebase.json`: Official Firebase Emulator Suite configuration.
  - `firestore.rules`: Security rules for local testing.
  - `scratch/real_emulator_suite.mjs`: Test suite executing Linker-X actual inventory logic directly against the official Firestore Emulator.
  - `scratch/real_emulator_suite.log`: Raw stdout execution log of the official emulator startup, execution, and shutdown.
  - `scratch/real_emulator_results.json`: Metric counts for 120 runs across 6 scenarios.
- Execution Command:
  `$env:JAVA_HOME = "C:\Users\WINDPINO\.tools\jdk-21\jdk-21.0.13.0.2+1"; $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"; npx firebase emulators:exec --only firestore --project emulator-test-isolated "node scratch/real_emulator_suite.mjs" | Tee-Object -FilePath "scratch/real_emulator_suite.log"`
- Real Firestore Emulator Test Results (120 runs, 20 runs per scenario):
  1. Scenario 1 (Current unpatched `onMoveStock` concurrent loading):
     - Setup: 본사창고 initial stock 100. Two workers concurrently move 10 units each to 차량1 and 차량2.
     - Expected: 본사창고 80, 차량1 10, 차량2 10.
     - Actual on Emulator: 본사창고 90, 차량1 10, 차량2 0 (or 0 and 10).
     - Result: 20/20 runs REPRODUCED Lost Update in real Firestore (100% bug reproduction rate).
  2. Scenario 2 (Current unpatched `handleBatchToggleProduct` batch loop):
     - Setup: 5 items (10 units each) batch-toggled in synchronous loop with stale snapshot.
     - Expected deduction: 50 (Remaining: 50).
     - Actual on Emulator: 10 deducted (Remaining: 90).
     - Result: 20/20 runs REPRODUCED Batch Overwrite in real Firestore (40 units lost every run).
  3. Scenario 3 (Current unpatched `onRevertAutoMoveStock` without match):
     - Setup: Initial stock 100. Two revert calls made without matching history records.
     - Expected: Revert rejected, stock remains 100.
     - Actual on Emulator: `setDoc` executes before history check, stock inflates to 120.
     - Result: 20/20 runs REPRODUCED Ghost Stock Inflation in real Firestore (100% bug reproduction rate).
  4. Scenario 4 (Proposed `runTransaction` + Operation ID concurrent loading):
     - Setup: 2 concurrent workers writing atomically via `runTransaction`.
     - Actual on Emulator: Contention automatically handled, stock accurately decremented to 80 (10 in 차량1, 10 in 차량2).
     - Result: 20/20 runs PASSED in real Firestore (100% success rate, 0 lost updates).
  5. Scenario 5 (Proposed `runTransaction` + Operation ID duplicate request idempotency):
     - Setup: Identical Operation ID submitted twice (simulating double-tap / retry).
     - Actual on Emulator: Second request detected `alreadyProcessed: true` and aborted write. Stock preserved at 90.
     - Result: 20/20 runs BLOCKED in real Firestore (100% idempotency, 0 double deductions).
  6. Scenario 6 (Proposed `runTransaction` + Operation ID revert safety):
     - Setup: Valid revert restores stock (90 -> 100). Duplicate revert on already-cancelled load or non-existent operation.
     - Actual on Emulator: Rejected with `INVALID_OR_ALREADY_CANCELLED`. Stock preserved at 100.
     - Result: 20/20 runs PASSED in real Firestore (0 ghost stock created).
- Production data touched?: NO. All 120 transactions executed in local Firestore emulator memory.
- Outstanding risks:
  - The proposed `runTransaction` pattern must now be safely integrated into the application components (`src/App.jsx` and `src/components/OrderList.jsx`) in a separate feature branch.
  - Production code on `main` branch remains untouched.

## 2026-11-16 — Antigravity — Actual Linker-X Code Modification & Official Emulator Verification (160 Runs)
- Status: COMPLETED (Verified in dedicated branch `feat/idempotent-inventory-transaction`)
- Branch: `feat/idempotent-inventory-transaction` (isolated from `main`; NO merge to `main`, NO production deployment)
- Target: Actual Linker-X loading/inventory handling code modified and tested on official Google Firestore Emulator.
- Files modified & created:
  - `src/utils/stockTransactionService.js` (NEW): Server-authoritative inventory transaction service (`moveStockAtomic`, `batchMoveStockAtomic`, `revertAutoMoveStockAtomic`, plus legacy comparison methods).
  - `src/App.jsx`: Integrated `moveStockAtomic`, added `onBatchMoveStock` with `batchMoveStockAtomic`, integrated `revertAutoMoveStockAtomic` with OpID tracking. Passed `onBatchMoveStock` prop to `OrderList`.
  - `src/components/OrderList.jsx`: Updated `handleBatchToggleProduct` to atomically batch-move loaded items, updated `handleItemMove` with async awaiting and deterministic Operation IDs.
  - `scratch/run_actual_code_tests.mjs` (NEW): Automated test harness executing 160 real Firestore Emulator test runs across 8 modes (4 unpatched + 4 patched x 20 iterations).
  - `scratch/actual_code_test_raw.log` (NEW): Full stdout console execution log from `firebase emulators:exec`.
  - `scratch/actual_code_test_results.json` (NEW): Structured JSON results of all 160 runs with initial stock, expected, actual, and status.
- Execution Environment:
  - Runtime: Microsoft OpenJDK 21 LTS (`jdk-21.0.13.0.2+1`) + Google `firebase-tools@15.36.0`
  - Emulator target: `127.0.0.1:8080`, project `emulator-test-isolated`
  - Zero network connection or writes to production database (`link-x-6606e`).
- Execution Command:
  `$env:JAVA_HOME = "C:\Users\WINDPINO\.tools\jdk-21\jdk-21.0.13.0.2+1"; $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"; npx firebase emulators:exec --only firestore --project emulator-test-isolated "node scratch/run_actual_code_tests.mjs" | Tee-Object -FilePath "scratch/actual_code_test_raw.log"`
- Exact Test Results (160 Runs, 20 runs each):
  1. [수정 전] 동시 상차 (20회):
     - 초기 재고: 100, 작업자 2명이 각각 10씩 동시 차감 (기대값: 80)
     - 결과: 20회 전수 90으로 덮어씀 (분실 갱신 20/20 버그 재현, 100% 재현율)
  2. [수정 전] 일괄 상차 (20회):
     - 초기 재고: 100, 5개 품목(각 10개) 루프 차감 (기대값: 50)
     - 결과: 20회 전수 90으로 덮어씀 (40개 차감 유실, 20/20 버그 재현, 100% 재현율)
  3. [수정 전] 중복 요청 (20회):
     - 초기 재고: 100, 동일 상차 요청 2회 연속 전송 (기대값: 90)
     - 결과: 20회 전수 80으로 중복 차감 (20/20 버그 재현, 100% 재현율)
  4. [수정 전] 상차 취소 유령 재고 (20회):
     - 초기 재고: 100, 이력 없는 허위/중복 취소 요청 (기대값: 100 유지)
     - 결과: 20회 전수 120으로 부풀려짐 (유령 재고 생성 20/20 버그 재현, 100% 재현율)
  5. [수정 후] 원자적 동시 상차 (20회):
     - `moveStockAtomic` 실행, Firestore 트랜잭션 경합 시 자동 재시도
     - 결과: 20회 전수 최종 재고 80 (차량1: 10, 차량2: 10) 정확히 일치 (20/20 PASS)
  6. [수정 후] 원자적 일괄 상차 (20회):
     - `batchMoveStockAtomic` 실행, 5건 모두 단일 트랜잭션 내 원자적 커밋
     - 결과: 20회 전수 최종 재고 50 (차량: 50, 처리건수: 5) 정확히 일치 (20/20 PASS)
  7. [수정 후] 중복 요청 멱등성 (20회):
     - 동일 `operationId` 2회 전송, 2회차 요청에서 `alreadyProcessed: true` 감지하여 추가 차감 스킵
     - 결과: 20회 전수 최종 재고 90 유지 (20/20 PASS)
  8. [수정 후] 상차 취소 안전성 및 유령 재고 차단 (20회):
     - 정상 상차건(10)은 1회 취소 시 정확히 100으로 복구
     - 동일건 중복 취소 시 `INVALID_OR_ALREADY_CANCELLED` 거부
     - 허위 주문건 취소 시 `INVALID_OR_ALREADY_CANCELLED` 거부
     - 결과: 20회 전수 유령 재고 0건, 최종 재고 100 안전 유지 (20/20 PASS)
- Production Safeguards:
  - `main` 브랜치는 수정/병합되지 않았음.
  - 배포는 사장님 최종 승인 전까지 일체 진행하지 않음.

## Log entry template
### YYYY-MM-DD — Actor — task
- Status:
- Branch / commit:
- Files changed:
- Checks actually run and results:
- Production data touched?:
- Outstanding risks and next action:
