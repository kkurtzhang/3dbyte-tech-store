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
| 2026-05-26 | Deployment hotfix | CMS, deployment | CMS Docker image now avoids recursively changing ownership for the whole `/opt` workspace during deployment; only the Strapi app runtime tree is owned by the non-root CMS user. | No | No | No | Yes, repeat Coolify deployment and CMS health verification. |
| 2026-05-26 | Deployment hotfix | Deployment | Added staging-based scoped redeploy helpers so storefront-only, backend-only, or CMS-only changes can be rebuilt/recreated without forcing a full compose rebuild. | No | No | No | Yes, verify the scoped service and confirm unchanged services remain running. |
| 2026-05-26 | Storefront/seed hotfix | Storefront, Medusa, deployment | `placehold.co` placeholders now use PNG URLs in seed data, storefront normalizes existing default `placehold.co` URLs before passing them to Next image optimization, and product detail pages are dynamic because pricing reads region cookies. | No | Yes | No | Yes, rerun AI catalogue seed, sync products, redeploy storefront, and recheck AI product pages. |
| 2026-05-26 | Storefront runtime config hotfix | Storefront, Meilisearch, product documents, deployment | Product-document search now reads the Meilisearch host, public search key, and document index from runtime env at server render time so key rotation and index access changes are picked up by the Download Center after a scoped storefront redeploy. | No | No | No | Yes, recheck `/downloads`, product document downloads, and product-document Meilisearch search. |
| 2026-05-26 | Staging runtime config | AI assistant, deployment | Staging storefront runtime `AI_PROVIDER` was aligned to `deepseek` so `/api/ai-shopping-assistant` uses the configured DeepSeek key/model instead of returning the assistant configuration guardrail. | No | No | Yes, include a config-gate smoke case. | Yes, repeat assistant smoke tests after storefront recreation or redeploy. |
