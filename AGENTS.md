# Linker X Mobile — AI Collaboration Instructions

Purpose: shared operating contract for ChatGPT, Google Antigravity, and human developers. This file is repository documentation, not automatic shared model memory.

## Source of truth and safeguards
- This repository is Linker X Mobile (React/Vite/Firebase PWA). Desktop and mobile share live Firebase business data.
- Never create, edit, delete or migrate live orders, invoices, stock, users, or warehouse data as part of testing unless the project owner explicitly approves the exact scope, account, and rollback plan.
- Preserve existing permissions for admin/staff and company isolation. Verify enforcement in backend/Firestore security rules; UI visibility is not security.
- Inspect current implementation before proposing changes. Never assert a test passed unless it was run and its results recorded.
- Work in a dedicated branch and seek review before merging/deploying functional changes. Do not silently deploy.
- Do not place credentials, private data, real customer data or tokens in issues, logs, examples or documentation.

## Product priorities
1. Reliable order → loading (상차) → sales invoice (전표) → delivery → inventory reconciliation.
2. Offline-first loading event capture with client-side durable queue, operation IDs, original event time, sync time, and explicit pending/confirmed/failed statuses.
3. Reconciliation using server-authoritative stock and idempotent, concurrency-safe processing. Never blindly overwrite entire inventory from stale client snapshots.
4. Keep field staff workflows simple; admins retain authorized configuration and audit access.
5. Mobile usability: text wrapping, touch targets, viewport overflow, navigational friction, and role-specific menus.

## Offline operation requirements (design guidance, not yet implemented/validated)
- Offline may capture loading events. Cached stock is historical, show last synced time; do not claim real-time accuracy offline.
- Connectivity indicator: offline red, pending/syncing amber, online+fully confirmed blue. Network reachability does not imply server writes succeeded.
- Server must deduplicate operation IDs and apply stock deltas atomically; detect conflicts and keep an audit trail.
- Preserve original action timestamp and separately record server confirmation timestamp.
- Do not finalize invoice/stock without appropriate server confirmation; recovery after interrupted/background PWA session must be tested.
- Keep other companies' potential routing/sequence requirements configurable rather than hard-coded.

## Handoff workflow
1. Read AGENTS.md, NEXT_TASKS.md, WORK_LOG.md and inspect current Git history before editing.
2. Record planned files, risk, and tests. Implement in a separate branch and run relevant build/lint/test suites (when available).
3. At end: update WORK_LOG.md with date, commit/branch, actual changes, test commands and outcomes, outstanding risks; update NEXT_TASKS.md statuses.
4. Push code and docs together. Another AI/human must explicitly read the latest GitHub state; no automatic cross-AI awareness exists.
5. If a requested operation is blocked, log the blocker accurately rather than claiming completion.

Last initialized: 2026-11-16 (Asia/Seoul).
