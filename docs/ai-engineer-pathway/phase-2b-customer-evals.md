# Phase 2B: Customer AI Evals

## Goal

Make assistant QA reflect how customers actually ask for help.

Phase 2B adds a customer-realistic eval baseline for AI shopping assistant behavior. The evals are not model-scored yet; they are structured prompts and expected answer rules that keep future AI work grounded in natural customer language.

## Scope

This slice covers:

- natural prompts for PETG outdoor parts, hardened nozzles, 3DSets-style RC hardware, compatibility uncertainty, documents, product links, stock/price claims, support handoff, and follow-up context;
- expected answer-shape hints for concise, useful customer replies;
- forbidden behavior notes for invention, mutation, unsupported compatibility, and premature support ticket creation;
- prompt-level response formatting guidance in the storefront assistant route.

This slice does not add live model grading, production eval storage, or a new observability dashboard.

## Data Placement

| Data | Owner |
| --- | --- |
| Customer eval prompts | Storefront assistant eval manifest |
| Response-quality rules | Storefront assistant eval manifest and route prompt |
| Expert product facts | Existing `/ai/product-guidance` expert context |
| Future live traces | Langfuse / observability, not part of this slice |

## Acceptance

- Eval prompts read like real customer questions, not QA instructions.
- Eval coverage includes PETG, hardened nozzles, RC electronics, compatibility details, product documents, support handoff, follow-ups, exact product links, stock/price guardrails, and comparisons.
- Every eval case records expected answer cues and forbidden behaviors.
- The assistant prompt asks for a short recommendation, grounded explanation, clear sections when useful, and one focused follow-up question when details are missing.
- Existing suggest-only and support-ticket confirmation guardrails remain intact.
