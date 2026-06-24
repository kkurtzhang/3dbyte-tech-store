# AI Assistant PII Guardrail Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent customer-supplied identifiers from appearing in assistant replies, expose the code-owned guardrail revision in Langfuse, and stop automatic smoke evals from running before a changed assistant runtime is deployed.

**Architecture:** Keep the prompt instruction and streamed-text redaction as layered defenses. Add a human-readable guardrail version to the existing prompt metadata, then use a small shell decision helper backed by Git history so GitHub Actions can distinguish deploy-required assistant changes from eval-only changes.

**Tech Stack:** Next.js App Router, TypeScript, Jest, Bash, GitHub Actions, Langfuse metadata.

---

### Task 1: Version the code-owned assistant guardrails

**Files:**
- Modify: `apps/storefront-v3/src/app/api/ai-shopping-assistant/prompt-management.ts`
- Test: `apps/storefront-v3/src/app/api/ai-shopping-assistant/__tests__/prompt-management.unit.spec.ts`

- [x] Add a failing assertion that fallback and Langfuse prompt metadata contain `code_guardrails_version`.
- [x] Export an explicit `CODE_OWNED_ASSISTANT_GUARDRAILS_VERSION` constant.
- [x] Include the version in all prompt metadata paths.
- [x] Verify the prompt-management and route privacy tests pass.

### Task 2: Make the smoke workflow deployment-aware

**Files:**
- Create: `.github/scripts/decide-ai-assistant-eval.sh`
- Create: `.github/scripts/__tests__/decide-ai-assistant-eval.test.sh`
- Modify: `.github/workflows/ai-assistant-evals.yml`

- [x] Add a failing shell regression test covering runtime, eval-only, and manual-dispatch decisions.
- [x] Implement Git-history-based change detection that fails closed when changed files cannot be determined.
- [x] Checkout two commits before evaluating the push and remove the duplicate checkout step.
- [x] Run the decision regression test.

### Task 3: Verify and prepare the change

**Files:**
- Remove: `apps/storefront-v3/artifacts/post-deploy-smoke-local.json`

- [x] Remove the local smoke artifact.
- [x] Run focused Jest tests, shell regression tests, lint, and `git diff --check`.
- [x] Review the diff for secrets and unrelated formatting churn.
- [ ] Commit with a conventional commit message and create a PR to `staging`.
