# Langfuse Prompt + Eval Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the storefront AI assistant use Langfuse-managed prompt wording and publish customer eval reports in a Langfuse-friendly shape while preserving code-owned safety guardrails.

**Architecture:** Keep immutable assistant safety constraints in code, and treat Langfuse Prompt Management as an optional overlay for editable wording/style. Eval output remains deterministic locally but gains score objects, session grouping, and optional Langfuse publishing for prompt-label comparisons.

**Tech Stack:** Next.js API route, Vercel AI SDK, Langfuse JS SDK, Jest, TypeScript.

---

### Task 1: Add Optional Langfuse Prompt Resolution

**Files:**
- Create: `apps/storefront-v3/src/app/api/ai-shopping-assistant/prompt-management.ts`
- Test: `apps/storefront-v3/src/app/api/ai-shopping-assistant/__tests__/prompt-management.unit.spec.ts`
- Modify: `apps/storefront-v3/src/app/api/ai-shopping-assistant/route.ts`
- Modify: `apps/storefront-v3/package.json`

- [x] **Step 1: Write failing prompt tests**

Test that prompt resolution:
- returns the code fallback when Langfuse is not configured;
- fetches prompt `storefront.ai-shopping-assistant.system` by label when configured;
- compiles variables into the Langfuse prompt if available;
- exposes prompt metadata suitable for trace metadata.

- [x] **Step 2: Run prompt tests to verify RED**

Run:

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 test -- --runInBand src/app/api/ai-shopping-assistant/__tests__/prompt-management.unit.spec.ts
```

Expected: fail because `prompt-management.ts` does not exist.

- [x] **Step 3: Implement prompt helper**

Create helper with:
- `CODE_OWNED_ASSISTANT_GUARDRAILS`
- `DEFAULT_ASSISTANT_PROMPT_NAME = "storefront.ai-shopping-assistant.system"`
- `resolveLangfusePromptLabel(env)` using `LANGFUSE_ASSISTANT_PROMPT_LABEL`, then `APP_ENV` if it is `staging` or `production`, otherwise `production`
- `resolveAssistantSystemPrompt({ env, langfuseClient })`
- safe fallback on missing SDK config or fetch failure

- [x] **Step 4: Wire route to helper**

Make `POST` await the resolved prompt before `streamText`, set `system` to the resolved prompt text, and attach prompt metadata to Langfuse trace metadata / AI SDK telemetry.

### Task 2: Add Langfuse-Friendly Eval Report Scores

**Files:**
- Modify: `apps/storefront-v3/src/app/api/ai-shopping-assistant/evals/customer-eval-runner.ts`
- Modify: `apps/storefront-v3/src/app/api/ai-shopping-assistant/__tests__/customer-eval-runner.unit.spec.ts`
- Modify: `apps/storefront-v3/scripts/run-customer-ai-evals.ts`

- [x] **Step 1: Write failing eval report tests**

Test that report results include score objects:
- `deterministic_pass`
- `grounding_cue_match`
- `format_warning_count`
- `forbidden_claim_count`

- [x] **Step 2: Run eval tests to verify RED**

Run:

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 test -- --runInBand src/app/api/ai-shopping-assistant/__tests__/customer-eval-runner.unit.spec.ts
```

Expected: fail because score objects are not emitted.

- [x] **Step 3: Implement score output**

Add score objects to each eval run result with `name`, `value`, `dataType`, `comment`, and metadata containing eval case id/tags. Boolean Langfuse scores use `1`/`0` values to match the Langfuse score API. Keep the existing pass/fail summary unchanged.

- [x] **Step 4: Add optional run metadata**

Include `runName`, `promptName`, and `promptLabel` in the report summary from env variables so CI artifacts can be correlated with Langfuse prompt labels.

- [x] **Step 5: Add optional Langfuse score publishing**

Group eval route calls by a stable Langfuse session id and add `AI_ASSISTANT_EVAL_UPLOAD_LANGFUSE=1` support so deterministic scores can be published to that session.

### Task 3: Docs + Verification

**Files:**
- Modify: `docs/ai-engineer-pathway/phase-3-operational-feedback.md`
- Modify: `docs/ai-engineer-pathway/future-change-register.md`
- Modify: `docs/storefront-backend-next-todo.md`

- [x] **Step 1: Document Langfuse prompt ownership**

Record that Langfuse owns editable wording/style, while code owns safety guardrails, validation, and tools.

- [x] **Step 2: Document eval usage**

Document how to run customer evals with prompt metadata:

```bash
AI_ASSISTANT_EVAL_BASE_URL=https://store.staging.3dbytetech.com.au \
AI_ASSISTANT_EVAL_RUN_NAME=staging-prompt-smoke \
LANGFUSE_ASSISTANT_PROMPT_LABEL=staging \
AI_ASSISTANT_EVAL_UPLOAD_LANGFUSE=1 \
LANGFUSE_EVAL_ENVIRONMENT=staging \
AI_ASSISTANT_EVAL_OUTPUT_FILE=artifacts/customer-ai-evals.json \
pnpm --filter=@3dbyte-tech-store/storefront-v3 eval:ai:customer
```

- [x] **Step 3: Verify**

Run:

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 test -- --runInBand src/app/api/ai-shopping-assistant/__tests__/prompt-management.unit.spec.ts src/app/api/ai-shopping-assistant/__tests__/route.test.ts src/app/api/ai-shopping-assistant/__tests__/customer-eval-runner.unit.spec.ts
pnpm --filter=@3dbyte-tech-store/storefront-v3 lint
pnpm --filter=@3dbyte-tech-store/storefront-v3 build
```

Result: targeted Jest tests, lint, `git diff --check`, and storefront build passed. `pnpm audit --audit-level high` still fails on the pre-existing security-upgrade backlog recorded in `docs/storefront-backend-next-todo.md`.
