# AI Expert Product Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Phase 2 expert product context to AI product guidance and assistant behavior.

**Architecture:** Keep Medusa, Strapi, and Meilisearch as the authoritative data sources. Compute lightweight expert routing/context inside backend `/ai/product-guidance`, then expose it through the existing `searchProducts` assistant tool. No new index or product module extension is introduced.

**Tech Stack:** Medusa backend API route, Meilisearch product hits, Strapi product descriptions, Next.js storefront assistant route, Jest unit tests.

---

### Task 1: Document Phase 2 Slice A

**Files:**
- Create: `docs/ai-engineer-pathway/phase-2-expert-product-models.md`
- Modify: `docs/ai-engineer-pathway/README.md`
- Modify: `docs/ai-engineer-pathway/future-change-register.md`

- [x] **Step 1: Add Phase 2 doc**

Add the goal, expert model list, data placement, and acceptance criteria for Slice A.

- [x] **Step 2: Link Phase 2 from README**

Add the Phase 2 doc to the Key Docs list.

- [x] **Step 3: Record the incoming Phase 2 change**

Append a future-change-register row marking backend AI guidance, storefront assistant, observability/evals, and staging verification as affected.

### Task 2: Backend Expert Context

**Files:**
- Create: `apps/backend/src/api/ai/product-guidance/product-experts.ts`
- Modify: `apps/backend/src/api/ai/product-guidance/route.ts`
- Modify: `apps/backend/src/api/ai/__tests__/internal-routes.unit.spec.ts`

- [x] **Step 1: Write failing backend tests**

Add assertions that `/ai/product-guidance` returns `expertContext.activeExperts` and per-product `expertSignals` for print-process and RC build queries.

- [x] **Step 2: Implement expert context builder**

Add deterministic expert activation based on query terms plus `tdp_*` and `rcb_*` product facts.

- [x] **Step 3: Attach expert context to product guidance**

Return root `expertContext` and per-product `expertSignals` without removing existing product fields.

- [x] **Step 4: Verify backend tests**

Run:

```bash
pnpm --filter=@3dbyte-tech-store/backend test:unit -- src/api/ai/__tests__/internal-routes.unit.spec.ts
```

### Task 3: Storefront Assistant Prompt

**Files:**
- Modify: `apps/storefront-v3/src/app/api/ai-shopping-assistant/route.ts`
- Modify: `apps/storefront-v3/src/app/api/ai-shopping-assistant/__tests__/route.test.ts`

- [x] **Step 1: Write failing storefront route test**

Assert that the system prompt names `expertContext`, `expertSignals`, `print_process`, `rc_model_building`, and `compatibility_triage`.

- [x] **Step 2: Update assistant prompt/tool guidance**

Tell the assistant to use expert context as grounded routing advice while preserving suggest-only behavior and support-ticket confirmation guardrails.

- [x] **Step 3: Verify storefront route test**

Run:

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 test -- src/app/api/ai-shopping-assistant/__tests__/route.test.ts --runInBand
```

### Task 4: Final Verification

**Files:**
- All touched files.

- [x] **Step 1: Run backend verification**

```bash
pnpm --filter=@3dbyte-tech-store/backend test:unit -- src/api/ai/__tests__/internal-routes.unit.spec.ts
```

- [x] **Step 2: Run storefront verification**

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 test -- src/app/api/ai-shopping-assistant/__tests__/route.test.ts --runInBand
```

- [x] **Step 3: Run builds**

```bash
pnpm --filter=@3dbyte-tech-store/backend build
NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter=@3dbyte-tech-store/storefront-v3 build
```

- [ ] **Step 4: Prepare PR**

Create a PR to `staging` with the standard body and no requested reviewers.
