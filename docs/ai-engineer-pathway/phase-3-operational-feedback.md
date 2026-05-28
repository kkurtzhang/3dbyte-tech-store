# Phase 3: Operational Feedback

## Goal

Make AI assistant changes repeatable to verify after every staging deploy.

Phase 3 starts by turning the customer-realistic eval manifest into a manual smoke runner that can call a deployed storefront assistant endpoint and score the answer with deterministic checks.

## Phase 3A: Customer Eval Runner

Run from the repo root:

```bash
AI_ASSISTANT_EVAL_BASE_URL=https://store.staging.3dbytetech.com.au \
AI_ASSISTANT_EVAL_LIMIT=3 \
pnpm --filter=@3dbyte-tech-store/storefront-v3 eval:ai:customer
```

Useful options:

| Env var | Purpose |
| --- | --- |
| `AI_ASSISTANT_EVAL_BASE_URL` | Storefront base URL. Defaults to `http://127.0.0.1:3001`. |
| `AI_ASSISTANT_EVAL_CASES` | Comma-separated eval case ids to run. |
| `AI_ASSISTANT_EVAL_LIMIT` | Limits the number of cases for quick smoke runs. |
| `AI_ASSISTANT_EVAL_OUTPUT=json` | Prints full JSON results for later tooling. |

## Current Scoring

The runner is intentionally deterministic and conservative:

- it decodes AI SDK streaming responses;
- it requires HTTP success and a non-empty decoded answer;
- it checks that at least one expected answer cue appears;
- it fails obvious unsafe mutation or unsupported protected-content claims;
- it records format-hint warnings without failing the run.

This is not a model-graded quality eval yet. It is a deploy smoke tool for catching broken assistant routes, stream decoding issues, missing product grounding, and severe guardrail failures.

## Future Work

- Add model-graded quality scoring after the deterministic smoke runner is stable.
- Store eval results in observability or CI artifacts.
- Add an admin-facing “last AI smoke status” workflow before production product-data changes.
- Promote selected smoke cases to CI only when they can run without paid/provider dependencies.
