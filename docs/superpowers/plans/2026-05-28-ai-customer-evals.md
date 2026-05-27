# AI Customer Evals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Phase 2B customer-realistic AI assistant eval prompts and response-quality guardrails.

**Architecture:** Keep evals as a typed storefront manifest colocated with the assistant route. Unit tests enforce natural customer wording, coverage tags, forbidden-behavior rules, and the assistant prompt response-format baseline.

**Tech Stack:** Next.js storefront route, Jest unit tests, TypeScript eval manifest, AI Engineer Pathway docs.

---

### Task 1: Customer Eval Manifest

**Files:**
- Create: `apps/storefront-v3/src/app/api/ai-shopping-assistant/evals/customer-evals.ts`
- Test: `apps/storefront-v3/src/app/api/ai-shopping-assistant/__tests__/customer-evals.unit.spec.ts`

- [x] **Step 1: Write failing tests**

Add tests that require natural customer wording, required coverage tags, and expected/forbidden answer rules.

- [x] **Step 2: Verify tests fail**

Run:

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 test -- src/app/api/ai-shopping-assistant/__tests__/customer-evals.unit.spec.ts --runInBand
```

Expected initial result: fail because `../evals/customer-evals` does not exist.

- [x] **Step 3: Add eval manifest**

Create a typed manifest with customer prompts covering PETG outdoor parts, hardened nozzles, RC electronics, compatibility details, product documents, support handoff, follow-ups, exact product links, stock/price guardrails, and comparisons.

### Task 2: Assistant Response-Quality Prompt

**Files:**
- Modify: `apps/storefront-v3/src/app/api/ai-shopping-assistant/route.ts`
- Modify: `apps/storefront-v3/src/app/api/ai-shopping-assistant/__tests__/route.test.ts`

- [x] **Step 1: Write failing route assertions**

Assert that the system prompt asks for a short recommendation, clear sections, and one focused follow-up question.

- [x] **Step 2: Verify route test fails**

Run:

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 test -- src/app/api/ai-shopping-assistant/__tests__/route.test.ts --runInBand
```

Expected initial result: fail because the prompt lacks the response-format baseline.

- [x] **Step 3: Update assistant prompt**

Add concise answer-format guidance while preserving product URL, suggest-only, expert context, and support-ticket confirmation guardrails.

### Task 3: Docs

**Files:**
- Create: `docs/ai-engineer-pathway/phase-2b-customer-evals.md`
- Modify: `docs/ai-engineer-pathway/README.md`
- Modify: `docs/ai-engineer-pathway/future-change-register.md`

- [x] **Step 1: Add Phase 2B doc**

Record goals, scope, data placement, and acceptance criteria.

- [x] **Step 2: Link and register the change**

Link Phase 2B from the AI Engineer Pathway README and add the future-change-register row.

### Task 4: Verification

**Files:**
- All touched files.

- [x] **Step 1: Run focused storefront tests**

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 test -- src/app/api/ai-shopping-assistant/__tests__/customer-evals.unit.spec.ts src/app/api/ai-shopping-assistant/__tests__/route.test.ts --runInBand
```

- [x] **Step 2: Run storefront lint/build**

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 lint
NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter=@3dbyte-tech-store/storefront-v3 build
```

- [x] **Step 3: Run diff/security checks**

```bash
git diff --check
pnpm audit --audit-level=high
```

- [ ] **Step 4: Prepare PR**

Create a PR to `staging` with the standard body and no requested reviewers.
