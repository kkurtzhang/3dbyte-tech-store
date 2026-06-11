# Admin Identity Issue Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe, audited repair actions and useful customer context to Medusa Admin Identity Issues.

**Architecture:** Extend the issue scanner with deterministic opaque IDs and sanitized resolution previews. A protected Admin POST route resolves the public ID against a fresh scan and dispatches to focused repair functions; the Admin page confirms and invokes those actions through React Query.

**Tech Stack:** Medusa v2.13, TypeScript, Jest, Medusa Admin SDK/UI, TanStack Query.

---

### Task 1: Sanitized issue detail and canonical selection

**Files:**
- Modify: `apps/backend/src/api/admin/identity-issues/identity-issues.ts`
- Create: `apps/backend/src/api/admin/identity-issues/identity-resolution.ts`
- Test: `apps/backend/src/api/admin/identity-issues/__tests__/identity-issues.unit.spec.ts`
- Test: `apps/backend/src/api/admin/identity-issues/__tests__/identity-resolution.unit.spec.ts`

- [x] Write failing tests for deterministic orphan IDs, safe asserted emails,
      matching customer summaries, related duplicate customers, and canonical
      selection by login count, activity, then creation date.
- [x] Run the focused tests and confirm they fail for missing fields/functions.
- [x] Implement the minimal sanitization and selection helpers.
- [x] Run the focused tests and confirm they pass.

### Task 2: Protected repair dispatcher

**Files:**
- Create: `apps/backend/src/api/admin/identity-issues/resolve/route.ts`
- Modify: `apps/backend/src/api/middlewares.ts`
- Modify: `apps/backend/src/api/admin/identity-issues/identity-resolution.ts`
- Test: `apps/backend/src/api/admin/identity-issues/resolve/__tests__/route.unit.spec.ts`
- Test: `apps/backend/src/api/__tests__/middlewares.unit.spec.ts`

- [x] Write failing tests for orphan cleanup, duplicate merge, consolidation
      retry, OAuth intent closure, stale issue rejection, and sanitized audit
      events.
- [x] Run the focused tests and confirm expected failures.
- [x] Implement a schema-validated `POST /admin/identity-issues/resolve` route
      and focused idempotent repair functions using Medusa module services and
      order-transfer workflows.
- [x] Run the focused tests and confirm they pass.

### Task 3: Admin actions and richer table

**Files:**
- Modify: `apps/backend/src/admin/lib/identity-issues.ts`
- Modify: `apps/backend/src/admin/hooks/account-security.tsx`
- Modify: `apps/backend/src/admin/routes/identity-issues/page.tsx`
- Test: `apps/backend/src/admin/lib/__tests__/identity-issues.unit.spec.ts`

- [x] Write failing helper tests for customer display text, badges, resolvable
      actions, and confirmation descriptions.
- [x] Run the helper tests and confirm expected failures.
- [x] Add a confirmation-backed Resolve action, mutation query invalidation,
      precise customer rendering, and resolution previews.
- [x] Run the helper tests and confirm they pass.

### Task 4: Manual auth runbook and verification

**Files:**
- Create: `docs/runbooks/customer-auth-manual-test.md`
- Modify: `docs/plans/2026-06-07-customer-auth-consolidation-rollout.md`

- [x] Document the `off`, `dry_run`, `live`, and Google auto-link environment
      phases plus every guest, email/password, Google, recovery, conflict, and
      Admin repair scenario.
- [x] Run focused backend/Admin tests, backend build, `git diff --check`, and
      `pnpm audit --audit-level=high`.
- [x] Review the final diff for secret exposure, authorization, unsafe deletes,
      direct order ownership updates, and missing confirmation states.
