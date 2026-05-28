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
| `AI_ASSISTANT_EVAL_OUTPUT_FILE` | Writes the JSON eval report to a file, creating parent directories as needed. |

To keep a local or CI artifact:

```bash
AI_ASSISTANT_EVAL_BASE_URL=https://store.staging.3dbytetech.com.au \
AI_ASSISTANT_EVAL_OUTPUT=json \
AI_ASSISTANT_EVAL_OUTPUT_FILE=artifacts/customer-ai-evals.json \
pnpm --filter=@3dbyte-tech-store/storefront-v3 eval:ai:customer
```

## Phase 3B: Manual Staging Eval Artifacts

The repo now includes a manually triggered GitHub Actions workflow:

```text
.github/workflows/ai-assistant-evals.yml
```

Use it after staging deploys that affect assistant behavior, product guidance, search grounding, product documents, support-ticket handoff, or observability. The workflow accepts:

| Input | Purpose |
| --- | --- |
| `base_url` | Storefront base URL, defaulting to staging. |
| `cases` | Optional comma-separated eval case ids. |
| `limit` | Optional max number of eval cases for quick smoke runs. |

The workflow uploads `customer-ai-evals-<run-number>` with:

- `customer-ai-evals.json`: structured report used for comparison and review.
- `customer-ai-evals.stdout.log`: exact command output, including package-manager warnings and runner stdout.

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
- Store eval results in observability after artifact-based manual runs are stable.
- Add an admin-facing “last AI smoke status” workflow before production product-data changes.
- Promote selected smoke cases to CI only when they can run without paid/provider dependencies.
- Improve top-level Langfuse trace names so assistant runs are easy to identify in the Langfuse UI, not only through named observations/spans.
