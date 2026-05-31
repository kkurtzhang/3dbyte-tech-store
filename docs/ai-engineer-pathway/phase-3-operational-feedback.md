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
| `AI_ASSISTANT_EVAL_RUN_NAME` | Names the eval run in JSON output and Langfuse score metadata. Defaults to a timestamped customer eval name. |
| `AI_ASSISTANT_EVAL_SESSION_ID` | Overrides the Langfuse session id used to group all assistant traces and scores from one eval run. |
| `AI_ASSISTANT_EVAL_CHATBOT_ID` | Overrides the eval trace `chatbotId`. Defaults to `storefront.customer-ai-evals`. |
| `AI_ASSISTANT_EVAL_SURFACE` | Overrides the eval trace surface. Defaults to `customer-eval-runner`. |

To keep a local or CI artifact:

```bash
AI_ASSISTANT_EVAL_BASE_URL=https://store.staging.3dbytetech.com.au \
AI_ASSISTANT_EVAL_OUTPUT=json \
AI_ASSISTANT_EVAL_OUTPUT_FILE=artifacts/customer-ai-evals.json \
pnpm --filter=@3dbyte-tech-store/storefront-v3 eval:ai:customer
```

## Phase 3B: Manual Staging Eval Artifacts

The repo now includes a GitHub Actions workflow:

```text
.github/workflows/ai-assistant-evals.yml
```

On `staging`, it runs automatically on pushes that change the assistant eval runner, assistant route/evals, this workflow, or this Phase 3 doc. It defaults to a 3-case staging smoke so every relevant staging merge gets a durable artifact without running the full suite by accident.

Manual `workflow_dispatch` is also defined, but GitHub only exposes manually dispatched workflows after the workflow file exists on the repository default branch. Until then, use the local command for ad hoc full-suite staging checks and rely on the automatic `staging` push run for GitHub-hosted artifacts.

When manual dispatch is available, the workflow accepts:

| Input | Purpose |
| --- | --- |
| `base_url` | Storefront base URL, defaulting to staging. |
| `cases` | Optional comma-separated eval case ids. |
| `limit` | Optional max number of eval cases for quick smoke runs. Defaults to `3`. |

The workflow uploads `customer-ai-evals-<run-number>` with:

- `customer-ai-evals.json`: structured report used for comparison and review.
- `customer-ai-evals.stdout.log`: exact command output, including package-manager warnings and runner stdout.

## Phase 3C: Langfuse Prompt and Score Control Plane

The assistant now supports Langfuse Prompt Management for dashboard-editable wording while preserving code-owned safety constraints.

Runtime prompt env:

| Env var | Purpose |
| --- | --- |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | Enables Langfuse prompt fetch and trace/score writes. |
| `LANGFUSE_HOST` | Self-hosted Langfuse base URL. |
| `LANGFUSE_ASSISTANT_PROMPT_NAME` | Prompt name. Defaults to `storefront.ai-shopping-assistant.system`. |
| `LANGFUSE_ASSISTANT_PROMPT_LABEL` | Prompt label. If unset, uses `APP_ENV` when it is `staging` or `production`, otherwise `production`. |

Safety rule: Langfuse owns editable tone/format wording only. The storefront route always appends the code-owned assistant guardrails after the dashboard prompt, including suggest-only behavior, exact `productUrl` copying, support-ticket confirmation, and no cart/order/customer mutation.

The eval runner now adds Langfuse-friendly score objects to every JSON result:

| Score | Data type | Meaning |
| --- | --- | --- |
| `deterministic_pass` | `BOOLEAN` as `1` or `0` | HTTP success plus required answer cues and no forbidden claims. |
| `grounding_cue_match` | `NUMERIC` | Ratio of expected answer cues matched. |
| `format_warning_count` | `NUMERIC` | Number of format-hint warnings. |
| `forbidden_claim_count` | `NUMERIC` | Number of forbidden mutation/protected-content claims. |

To publish these deterministic scores to Langfuse and group the related traces by session:

```bash
AI_ASSISTANT_EVAL_BASE_URL=https://store.staging.3dbytetech.com.au \
AI_ASSISTANT_EVAL_LIMIT=3 \
AI_ASSISTANT_EVAL_RUN_NAME=staging-customer-smoke \
AI_ASSISTANT_EVAL_UPLOAD_LANGFUSE=1 \
LANGFUSE_EVAL_ENVIRONMENT=staging \
LANGFUSE_ASSISTANT_PROMPT_LABEL=staging \
pnpm --filter=@3dbyte-tech-store/storefront-v3 eval:ai:customer
```

The next step for LLM-as-judge is to create a Langfuse dataset from the customer eval cases and add dashboard-managed evaluator prompts. Keep deterministic scores as the release gate; use judge scores for quality trends and review queues until the judge is calibrated.

## Phase 3D: Trace I/O Debuggability

Storefront assistant traces now set top-level Langfuse input and output so the dashboard no longer shows “trace did not receive an input or output” for the browser chat route.

Trace input includes:

- latest user message, sanitized;
- message count;
- prompt name and prompt label;
- chatbot id and surface.

Trace output includes:

- final assistant text, sanitized;
- finish reason when the provider reports one.

Sanitization masks emails, order/support references, and common commerce IDs before the values are written to Langfuse. Full transcripts should only move into support tickets or review tooling when the customer explicitly consents.

## Recommended Next Langfuse Feature

Prioritize a human feedback and annotation loop before heavier judge automation:

- Add storefront thumbs/comment feedback for assistant answers.
- Publish feedback as Langfuse scores on the same trace/session.
- Create an annotation queue for low-score, thumbs-down, support-handoff, and eval-failing conversations.
- Convert reviewed examples into Langfuse dataset items or repo-owned eval cases.

This gives future LLM-as-judge and prompt experiments trusted examples to calibrate against instead of asking a model to grade another model with no human anchor.

## Current Scoring

The runner is intentionally deterministic and conservative:

- it decodes AI SDK streaming responses;
- it requires HTTP success and a non-empty decoded answer;
- it checks that at least one expected answer cue appears;
- it fails obvious unsafe mutation or unsupported protected-content claims;
- it records format-hint warnings without failing the run.

This is not a model-graded quality eval yet. It is a deploy smoke tool for catching broken assistant routes, stream decoding issues, missing product grounding, and severe guardrail failures. Deterministic scores can now be stored in Langfuse for comparison across sessions and prompt labels.

## Future Work

- Add Langfuse dataset-backed LLM-as-judge scoring after deterministic scores are visible and stable.
- Add customer feedback scoring and annotation queues before relying on LLM-as-judge trends.
- Tag assistant traces with git SHA/deploy id for release-over-release cost, cache, latency, and score comparison.
- Add alerts for missing trace input/output, sudden assistant errors, cost spikes, and low feedback scores.
- Add an admin-facing “last AI smoke status” workflow before production product-data changes.
- Promote selected smoke cases to CI only when they can run without paid/provider dependencies.
