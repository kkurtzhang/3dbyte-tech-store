# Phase 2: Expert Product Models

## Goal

Add grounded expert context for the AI shopping assistant without creating a new source of truth.

Phase 2 starts with deterministic expert models layered on top of Phase 1 product data:

- print-process advice;
- RC model building advice;
- compatibility triage;
- support handoff guidance.

The assistant may explain and route with this context, but it must keep suggest-only behavior and must not invent compatibility, stock, price, safety, discount, or protected 3DSets model claims.

## Phase 2 Slice A

Slice A adds expert context to `/ai/product-guidance` and teaches the storefront assistant prompt to use it.

```text
assistant query
-> searchProducts tool
-> backend /ai/product-guidance
-> Medusa + Meilisearch + Strapi product context
-> deterministic expertContext + per-product expertSignals
-> assistant answer grounded in structured expert guidance
```

## Expert Models

| Expert | Purpose | Grounding |
| --- | --- | --- |
| `print_process` | Material, nozzle, bed, drying, enclosure, and build-surface guidance. | `metadata.three_d_printing`, flattened `tdp_*`, Strapi product copy, product documents. |
| `rc_model_building` | 3DSets-style RC electronics, hardware, connectors, batteries, fasteners, and printed build components. | `metadata.rc_model_building`, flattened `rcb_*`, Strapi product copy, product documents. |
| `compatibility_triage` | Identify compatibility uncertainty, ask required follow-up questions, and avoid unsupported yes/no claims. | Product metadata, query wording, product role, known connector/voltage/material facts. |
| `support_handoff` | Explain when a human support ticket is appropriate. | Existing support-ticket guardrails and customer confirmation requirements. |

## Data Placement

Phase 2 does not add a new product module or a separate product metadata index.

| Data | Owner |
| --- | --- |
| Commerce facts | Medusa product/variant fields |
| Structured product facts | Medusa product metadata |
| Rich product explanations | Strapi product descriptions |
| Manuals/datasheets/SDS/install guides | Strapi product documents |
| Expert context | Computed at request time by backend AI product guidance |
| Assistant behavior | Storefront assistant prompt and tools |

## Acceptance

- `/ai/product-guidance` returns root `expertContext`.
- Each returned product may include `expertSignals` describing why specific experts are relevant.
- Print-process queries activate `print_process`.
- 3DSets/RC hardware queries activate `rc_model_building`.
- Fit/compatibility/help queries activate `compatibility_triage`.
- Support handoff guidance remains suggest-only and requires explicit customer confirmation before ticket creation.
- Existing Phase 1 product guidance payload fields remain backward compatible.
