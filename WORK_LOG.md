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
- Files changed: scratch/test_emulator_isolation.mjs, scratch/run_concurrency_stress_matrix.mjs, WORK_LOG.md
- Checks actually run and results:
  1. Emulator Isolation & Fail-Closed Test (`scratch/test_emulator_isolation.mjs`):
     - Configured Firestore to strict local emulator (`connectFirestoreEmulator` to 127.0.0.1:58088).
     - Verified connection refusal immediately terminates with `connect ECONNREFUSED 127.0.0.1:58088`.
     - Confirmed ZERO traffic routed to production cloud (`link-x-6606e`). Fail-closed behavior validated.
  2. Concurrency Stress Matrix (20 runs each, 100 total simulated tests in `scratch/run_concurrency_stress_matrix.mjs`):
     - Test 1 (Current unpatched code - Monolithic setDoc Concurrency):
       - Before: 본사창고 100
       - Expected after 2 workers load 10 each: 본사창고 80, 차량1 10, 차량2 10
       - Actual: 본사창고 90, 차량1 0, 차량2 10
       - Result: 20/20 runs REPRODUCED Lost Update (100% failure rate on concurrent loads).
     - Test 2 (Current unpatched code - Batch Toggle Overwrite):
       - 5 items (10 units each) batch-toggled in synchronous loop.
       - Expected deduction: 50
       - Actual deduction: 10 (40 units lost due to stale snapshot in closure).
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
  - Next step: Await user approval before porting proposed atomic transaction and Operation ID architecture into application code in a separate branch.

## Log entry template
### YYYY-MM-DD — Actor — task
- Status:
- Branch / commit:
- Files changed:
- Checks actually run and results:
- Production data touched?:
- Outstanding risks and next action:
