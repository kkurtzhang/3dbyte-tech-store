# Future Change Register

Use this register for every incoming change that could affect AI-ready product data, search, assistant behavior, product documents, or staging verification.

## Entry Template

| Field | Value |
| --- | --- |
| Date | YYYY-MM-DD |
| Git commit / PR |  |
| Area affected | Medusa, Strapi, Meilisearch, AI assistant, product documents, support tickets, observability, deployment |
| What changed |  |
| Metadata schema changed? | Yes/No |
| Seed data changed? | Yes/No |
| AI evals need new cases? | Yes/No |
| Staging verification must be repeated? | Yes/No |

## Register

| Date | Git commit / PR | Area affected | What changed | Metadata schema changed? | Seed data changed? | AI evals need new cases? | Repeat staging verification? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-05-25 | This branch | Product documents, support tickets, AI assistant, observability | Staging already has product documents, support tickets, AI assistant routes, and observability available before Phase 1 metadata work. | No | No | Yes, include existing assistant and support-ticket guardrails. | Yes |
| 2026-05-25 | This branch | Medusa, Meilisearch | Product metadata was not fetched into product Meilisearch sync before Phase 1. This branch adds metadata fetching and flattened `tdp_*`/`rcb_*` fields. | Yes | No | Yes | Yes |
| 2026-05-25 | This branch | Product documents, Meilisearch | Product-document search remains metadata/keyword based; full PDF text extraction is not part of Phase 1. | No | No | Yes, document discovery cases should use `search_keywords`. | Yes |
| 2026-05-25 | This branch | Deployment, data | Local DB/Meilisearch contains DREMC data, while staging is fresh with 0 products. Local is reference only. | No | No | No | Yes |
| 2026-05-25 | This branch | Deployment, acceptance | Phase 1 acceptance environment is fresh staging after Coolify redeploy. Code must deploy before staging seed. | No | Yes | Yes | Yes |
| 2026-05-26 | Hotfix after staging seed | Storefront, deployment | Staging AI seed images use `placehold.co` placeholder URLs; storefront image remote patterns must allow that host until product-specific media moves to Strapi/S3. | No | No | No | Yes, repeat product-page verification after storefront redeploy. |
