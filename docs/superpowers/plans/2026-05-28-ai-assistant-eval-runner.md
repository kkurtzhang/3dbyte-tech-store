# AI Assistant Customer Eval Runner Plan

**Goal:** Add a repeatable manual smoke runner for the customer-realistic AI assistant eval manifest.

**Architecture:** Keep eval definitions colocated with the storefront assistant. Add pure runner utilities for stream decoding/scoring and a small CLI wrapper for staging/local endpoint checks. The runner is deterministic and does not introduce provider calls in CI by default.

## Tasks

- [x] Add failing unit tests for stream decoding, answer scoring, and mocked endpoint execution.
- [x] Implement `customer-eval-runner.ts` utilities.
- [x] Add `eval:ai:customer` storefront command and CLI script.
- [x] Document Phase 3A operational feedback workflow.
- [x] Run final focused tests, lint, and build.
- [ ] Create PR to `staging` without requested reviewers.

## Verification Commands

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 test -- src/app/api/ai-shopping-assistant/__tests__/customer-eval-runner.unit.spec.ts --runInBand
AI_ASSISTANT_EVAL_BASE_URL=https://store.staging.3dbytetech.com.au AI_ASSISTANT_EVAL_LIMIT=1 pnpm --filter=@3dbyte-tech-store/storefront-v3 eval:ai:customer
pnpm --filter=@3dbyte-tech-store/storefront-v3 lint
NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter=@3dbyte-tech-store/storefront-v3 build
```
