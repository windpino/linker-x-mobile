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
