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
