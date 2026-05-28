# AI Eval Artifacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make customer AI assistant smoke runs produce durable JSON artifacts and a manually triggered staging workflow.

**Architecture:** Keep eval scoring in the existing storefront eval runner utility. Add a summary/report builder that both tests and the CLI can use, then let the CLI write the same report to a file when requested. Add a manual GitHub Actions workflow that runs against staging and uploads the JSON report as an artifact.

**Tech Stack:** Next.js storefront package, Jest, pnpm, GitHub Actions `workflow_dispatch`, `actions/upload-artifact@v4`.

---

### Task 1: Report Builder

**Files:**
- Modify: `apps/storefront-v3/src/app/api/ai-shopping-assistant/evals/customer-eval-runner.ts`
- Modify: `apps/storefront-v3/src/app/api/ai-shopping-assistant/__tests__/customer-eval-runner.unit.spec.ts`

- [x] **Step 1: Write the failing report summary test**

Add a Jest test that calls `buildCustomerAiEvalReport` with one passing and one failing result, fixed `endpointUrl`, and fixed `generatedAt`. Expected summary:

```ts
{
  endpointUrl: "https://store.staging.3dbytetech.com.au/api/ai-shopping-assistant",
  failed: 1,
  generatedAt: "2026-05-28T00:00:00.000Z",
  passed: 1,
  total: 2,
  warnings: 2,
}
```

- [x] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 test -- src/app/api/ai-shopping-assistant/__tests__/customer-eval-runner.unit.spec.ts --runInBand
```

Expected: fail because `buildCustomerAiEvalReport` is not exported yet.

- [x] **Step 3: Implement the report builder**

Export:

```ts
export type CustomerAiEvalSummary = {
  endpointUrl: string
  failed: number
  generatedAt: string
  passed: number
  total: number
  warnings: number
}

export type CustomerAiEvalReport = {
  results: CustomerAiEvalRunResult[]
  summary: CustomerAiEvalSummary
}

export function buildCustomerAiEvalReport(
  results: CustomerAiEvalRunResult[],
  endpointUrl: string,
  generatedAt = new Date().toISOString(),
): CustomerAiEvalReport
```

- [x] **Step 4: Run the test and verify GREEN**

Run the same Jest command. Expected: pass.

### Task 2: CLI Artifact Output

**Files:**
- Modify: `apps/storefront-v3/scripts/run-customer-ai-evals.ts`
- Modify: `docs/ai-engineer-pathway/phase-3-operational-feedback.md`

- [x] **Step 1: Update the CLI**

Add `AI_ASSISTANT_EVAL_OUTPUT_FILE`. When set, create parent directories and write the JSON report to that path with a trailing newline. Keep stdout JSON valid when `AI_ASSISTANT_EVAL_OUTPUT=json` by not printing extra status lines in JSON mode.

- [x] **Step 2: Document the option**

Add `AI_ASSISTANT_EVAL_OUTPUT_FILE` to the Phase 3 env table and show a staging command that writes `artifacts/customer-ai-evals.json`.

- [x] **Step 3: Verify file output**

Run:

```bash
rm -rf /tmp/3dbyte-ai-evals
AI_ASSISTANT_EVAL_BASE_URL=https://store.staging.3dbytetech.com.au \
AI_ASSISTANT_EVAL_LIMIT=1 \
AI_ASSISTANT_EVAL_OUTPUT=json \
AI_ASSISTANT_EVAL_OUTPUT_FILE=/tmp/3dbyte-ai-evals/customer-ai-evals.json \
pnpm --filter=@3dbyte-tech-store/storefront-v3 eval:ai:customer
test -s /tmp/3dbyte-ai-evals/customer-ai-evals.json
```

Expected: eval passes and the JSON file exists.

### Task 3: Manual Staging Workflow

**Files:**
- Create: `.github/workflows/ai-assistant-evals.yml`
- Modify: `docs/ai-engineer-pathway/phase-3-operational-feedback.md`
- Modify: `docs/storefront-backend-next-todo.md`
- Modify: `docs/ai-engineer-pathway/future-change-register.md`

- [x] **Step 1: Add workflow**

Create a `workflow_dispatch` workflow with inputs `base_url`, `cases`, and `limit`. It checks out the requested commit, installs with pnpm, runs `eval:ai:customer` against `base_url`, writes `artifacts/customer-ai-evals.json`, and uploads `artifacts/*` with `actions/upload-artifact@v4`.

- [x] **Step 2: Record future observability task**

Add “Improve top-level Langfuse trace names for storefront AI assistant runs” to `docs/storefront-backend-next-todo.md` with acceptance criteria that traces show a friendly top-level name in the Langfuse UI while existing observations/spans remain intact.

- [x] **Step 3: Update pathway docs/register**

Document Phase 3B and add a future-change-register row for the manual eval artifact workflow.

- [x] **Step 4: Verify workflow syntax and package checks**

Run:

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 test -- src/app/api/ai-shopping-assistant/__tests__/customer-eval-runner.unit.spec.ts --runInBand
pnpm --filter=@3dbyte-tech-store/storefront-v3 lint
git diff --check
```

Expected: all pass.
