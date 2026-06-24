# Storefront V3 + Backend Next TODO

This document tracks the remaining work after the current storefront-v3 content and search improvements.

## Scope

- Keep **Medusa** as source of truth for commerce entities and relations.
- Use **Strapi** for content enrichment (copy, media, SEO blocks).
- Use **Meilisearch** for low-latency discovery/query UX.

## Guiding Rules

1. Do not duplicate source-of-truth data between Medusa and Strapi.
2. Join enrichment content by stable handles/ids (`handle`, `medusa_*_id`).
3. Always provide graceful fallbacks to Medusa/base content when Strapi/Meili is missing.
4. Keep all internal navigation links route-valid and avoid placeholder links.
5. Ship with tests first (TDD): write failing tests, implement, then verify.

## Completed Since This TODO Was Written

These items are no longer open TODOs and should be treated as shipped baseline unless a regression is found.

- `/collections` landing page exists and overlays Strapi collection content by handle with empty/error states.
- Medusa-native support tickets exist across backend module, Storefront contact flow, Medusa Admin list/detail routes, AI handoff endpoint, ticket events/messages, and notification hooks.
- Product documents exist across Strapi product-document content type, backend public document APIs/download routes, Meilisearch `product_documents_public`, Storefront product-page downloads, and the Download Center.
- AI shopping assistant routes exist for product guidance, order lookup, tracking, shipping estimate, and support-ticket handoff.
- Observability tracing plumbing exists for backend, CMS, and storefront through `@3dbyte-tech-store/observability`.
- AI-ready realistic product Chunk A exists on `feature/ai-ready-realistic-products`: metadata flattening, product index settings, `/ai/product-guidance` `aiContext`, deterministic `ai-*` seed catalogue, and pathway docs.
- Phase 1 AI-ready realistic products are complete on staging: 29 `ai-*` products, 29 rich Strapi descriptions, 64 public product documents in `stg_product_documents_public`, product/document Meilisearch sync, generated product media, Download Center search, product-page downloads, browser image verification, and assistant product-guidance smoke checks.
- Langfuse assistant tracing now groups browser chat turns by session, sets assistant trace metadata/name/tags, records sanitized top-level trace input/output for debugging, and records DeepSeek cache-aware token usage for cost tracking.
- Launch-gate order/account/tracking fixes verified on staging: logged-in order history/detail show order `3DBO-AKK7-5KYYDE` as shipped, public order lookup returns `fulfillment_status: shipped` with tracking label `STG-3DBO-AKK7-5KYYDE`, payment provider payloads are absent from public lookup responses, and Gmail received the shipment notification email.
- Launch-gate account-address fixes are on staging: the slide-over form was replaced with URL-driven inline add/edit panels, Medusa v2 address fields are represented, Australian address autocomplete/state fields are wired, saves reset and hide the form, and account nav/auth refresh behavior was polished.
- Launch-gate shipping-rate fixes are on staging: Karrio checkout rate shopping no longer sends stale hardcoded carrier/service filters, carrier-message failures fall back to fixed/manual delivery options instead of raw checkout errors, and known regional Aramex/Karrio `sLACode` lanes are documented for future carrier coverage work.
- Customer auth launch-gate behavior is decided and covered by the auth follow-up work: email/password signup requires email verification before account access, signup sends a verification email rather than a separate welcome email, same-email guest customer records are claimed/upgraded during signup instead of creating duplicate accounts, Google OAuth links or claims same-email customer records before creating a new customer, storefront forgot/reset password entry points plus a customer password-reset email subscriber exist, and account settings expose login methods with a Connect Google flow for existing accounts.
- Customer account coordination is implemented on `feature/customer-auth-consolidation` as a Medusa-aligned hybrid: verified exact-email ownership can consolidate separate guest history into a canonical registered customer, Google and email/password identities can share that customer, sensitive provider and email changes require reauthentication, and Medusa Admin exposes provider status plus a read-only Identity Issues queue. It becomes staging baseline only after the protected PR deploy; rollout remains controlled by `off`, `dry_run`, and `live`.

## Remaining TODO (Priority Order)

### Launch-gate follow-up: Karrio selected-rate fulfillment and carrier coverage (Backend + Shipping)

- Found: `2026-06-03` staging launch gate on order `3DBO-8U96-P49VDH` / `order_01KT6KGS5Q761NQ94XA6QXV52Z`.
- Problem: checkout successfully quoted and charged the selected Aramex Economy live Karrio rate, but Medusa Admin fulfillment failed when creating the Karrio shipment with `service_unavailable`: "The service you selected is not available for this shipment."
- Evidence:
  - Staging runtime has `KARRIO_TEST_MODE=true`.
  - `KARRIO_FULFILLMENT_OPTIONS` was unset, so the Karrio fulfillment provider used default option data.
  - Stored order shipping method data included the selected live rate id, `service: "aramex_aunz"`, `carrier_id: "Aramex"`, and `service_name: "Aramex Economy"`.
  - The shipping option fallback data still used generic defaults such as `service: "aramex_economy"` and `carrier_id: "aramex"`.
- Likely cause to investigate: fulfillment label creation is not using Karrio's selected-rate purchase path/service metadata correctly for Aramex AU/NZ; compare direct `/v1/shipments` versus selected-rate `/v1/proxy/shipments` behavior before changing code.
- Acceptance:
  - Karrio test-mode fulfillment can create a test shipment/label from a checkout-selected Aramex Economy or Priority rate.
  - The fulfillment record stores Karrio shipment id, tracking number, label URL, carrier, and selected-rate metadata.
  - No real-label behavior is enabled in staging while `KARRIO_TEST_MODE=true`.
  - Regression tests cover selected-rate fulfillment data, not only rate calculation.

### Launch-gate bug: Assistant must not invent unavailable products or stale links (Storefront + AI)

- Found: `2026-06-03` staging launch gate with prompt: "Which PETG should I use for outdoor parts?"
- Problem: the assistant gave a nicely formatted answer but recommended products and links that are not current staging catalogue results, including a stale `3dbyte.shop` product URL and an unavailable FormFutura PETG recommendation.
- Expected behavior:
  - Recommend only products returned by current product search/product-guidance data, or explicitly say the store does not currently carry a suggested alternative.
  - Use canonical current storefront product URLs for product links.
  - If a better material such as ASA is relevant but unavailable, present it as general guidance, not as an in-store product recommendation.
- Acceptance:
  - Customer-style PETG, nozzle, drying/storage, and 3DSets/RC prompts produce current-catalogue recommendations only.
  - Stale domains such as `3dbyte.shop` never appear in assistant product links.
  - Existing support-ticket confirmation guardrails remain intact.
  - Langfuse eval cases include this prompt and fail on unavailable products or stale product URLs.

### 0) Security dependency upgrade pass (All apps)

- Status: the broad June dependency/security upgrade was completed. A smaller follow-up remains for newly reported transitive advisories.
- Last checked: `2026-06-24` on `staging`; `pnpm audit --audit-level=high` reported 6 advisories: 4 low, 1 moderate, and 1 high. The high advisory is `undici <6.27.0` through `apps/cms > @strapi/strapi > @strapi/core`.
- Current audit targets:
  - Upgrade or override the Strapi-compatible `undici` path to `6.27.0+` after compatibility verification.
  - Review the remaining moderate/low advisories and keep explicit ignores limited to documented non-runtime or accepted risks.
- Acceptance:
  - `pnpm audit --audit-level=high` is clean, or any remaining advisories have explicit risk acceptance notes with owner/date.
  - CMS, backend, and storefront builds pass after upgrades.
  - Strapi admin/content APIs, Medusa backend, storefront core routes, and Meilisearch sync paths are smoke-tested.
  - Lockfile changes are reviewed separately from feature work.

### Future scaling: distributed account-security rate limiting (Backend)

- Current scope: sensitive customer account mutations are throttled per customer and operation in each backend process.
- Trigger: before scaling Medusa to multiple backend replicas.
- Deliverable: move account-security rate-limit buckets to shared Redis or another atomic shared store.
- Acceptance:
  - Limits are enforced consistently across all backend replicas.
  - Retry windows and `Retry-After` behavior remain unchanged.
  - Auth and account-security routes retain focused rate-limit tests.

### 1) Expand Strapi collection content coverage (CMS Content)

- Problem: Strapi currently has sparse collection rows and handle mismatches.
- Deliverable:
  - Ensure each Medusa collection has matching Strapi `collections.Handle`.
  - Populate `Title`, `Description`, and `Image`.
- Acceptance:
  - Overlay appears on homepage cards and collection detail pages.
  - Fallback path still works if a collection has no Strapi row.

### 2) Increase indexed blog content for Help/Guides search (CMS + Search)

- Problem: Meilisearch `blog` index has too few documents, limiting search quality.
- Deliverable:
  - Publish additional guide/help posts in Strapi.
  - Re-sync to Meilisearch `blog` index.
- Acceptance:
  - `blog` index has meaningful volume.
  - `/api/content-search` returns relevant article/guide hits for common queries.

### 3) Harden support-ticket workflow after launch (Backend + Storefront + Admin + AI)

- Status: Launch-minimum workflow is implemented.
- Remaining follow-up:
  - Smoke-test staging ticket creation from Storefront and AI assistant after each deploy.
  - Verify customer acknowledgement, internal alert, and customer-visible reply notifications with the selected email provider.
  - Confirm Admin list/detail triage works for real staged tickets.
  - Add any missing operational views only after real support flow usage.
- Deferred:
  - External OSS helpdesk sync, if Medusa Admin becomes too thin for support workload.
  - Customer account ticket history and threaded customer replies from the storefront.
  - SLA dashboards, assignment queues, tags, saved views, and attachment uploads.

### 4) Render assistant recommendations from structured product cards (Storefront + Backend)

- Status: canonical `productUrl` is now included in AI product guidance and the assistant prompt forbids using image/thumbnail URLs as product links.
- Problem: model-authored Markdown links are still less reliable than UI-rendered product cards from structured tool output.
- Deliverable:
  - Render assistant product cards from `searchProducts` tool output instead of relying on model-authored product links.
  - Keep prompt/tests requiring product links to use `productUrl` or no link.
- Acceptance:
  - Assistant product cards link to route-valid product pages.
  - Placeholder image URLs are never presented as product navigation links.
  - Existing support-ticket confirmation guardrails remain intact.

### 5) Enrich material search result sections (Storefront + Search)

- Problem: material searches such as `PETG` can legitimately return compatible accessories because `tdp_best_for` says those products are useful for PETG, but the result page does not yet separate exact material products from helpful accessories.
- Deliverable:
  - Add a **Filament only** filter/section for material queries using exact material/product-kind metadata where available.
  - Add a **Best useful for PETG** style section for compatible accessories such as nozzles, adhesion tools, build surfaces, drying/storage, and maintenance products.
  - Consider a ranking boost for exact filament/material matches so PETG filament is visually primary while related accessories remain discoverable.
- Acceptance:
  - Searching `PETG` clearly distinguishes PETG filament from PETG-compatible accessories.
  - Accessory results are still discoverable without looking like the main material match.
  - Section labels are metadata-driven enough to work in production, not hardcoded only for staging seed handles.

### 6) Move remaining static Help/Guides blocks to CMS (Storefront + CMS)

- Problem: category/popular-resource blocks are still hardcoded.
- Deliverable:
  - Define/reuse Strapi types for Help/Guides block content.
  - Render page sections from CMS with robust fallbacks.
- Acceptance:
  - Content team can update Help/Guides without code changes.
  - Page remains stable if CMS fields are missing.

### 7) Calibrate Langfuse prompt and judge workflows (Observability + AI)

- Status: Langfuse Prompt Management, assistant session grouping, cache-aware usage, sanitized trace input/output, tiered customer eval suites, multi-turn evaluation, and evidence-backed deterministic score publishing are implemented. LLM-as-judge remains a follow-up after deterministic eval scores and human feedback are visible and trusted.
- Problem: dashboard-managed prompts and Langfuse judge scores are useful for prompt iteration, but they should not replace code-owned safety constraints or deterministic release gates.
- Deliverable:
  - Keep assistant tone/format wording in Langfuse Prompt Management with `staging` and `production` labels.
  - Keep hard assistant guardrails in code and append them after any dashboard-managed prompt.
  - Keep the 8-case smoke, 28-case release, and 43-case extended suites current as catalogue/tool behavior changes.
  - Publish deterministic and evidence-backed eval scores to individual Langfuse traces for prompt-label comparisons.
  - Keep `grounded_answer` unset until tool/source facts can verify claims; keep helpfulness, actionability, and reviewer notes human-owned.
  - Next high-value improvement: add customer feedback capture from the storefront assistant and map thumbs/comment feedback to Langfuse scores on the same session/trace.
  - Next high-value improvement: create an annotation queue for low-score, thumbs-down, or support-handoff conversations so human review creates trusted examples.
  - Create a Langfuse dataset from customer-realistic eval cases and selected reviewed conversations.
  - Add LLM-as-judge prompts for response quality trends after deterministic scores and human annotations are stable.
- Acceptance:
  - A staging smoke run records prompt name, prompt label, prompt source, and prompt version in Langfuse metadata.
  - Assistant traces show sanitized top-level input/output in Langfuse without exposing emails, order references, or commerce IDs.
  - Customer feedback scores can be filtered by session, prompt label, and chatbot surface.
  - Annotation queue items can be converted into eval cases or dataset items.
  - Deterministic score objects appear on the same Langfuse session and individual trace pages as the eval traces.
  - LLM-as-judge scores are used for review/trend insight only until calibrated against human judgment.
  - Deterministic eval pass/fail remains the release gate.

### 8) Parked Langfuse ideas after feedback loop (Observability + AI)

- Prompt experiments in Langfuse: useful once datasets and scores have enough volume; avoid treating dashboard experiments as a release gate until deterministic evals stay green.
- Release comparison dashboards: tag traces with git SHA/deploy id and compare latency, cost, cache hit rate, deterministic scores, and feedback by release.
- Alerting: notify on sudden assistant 5xx rate, missing trace input/output, low feedback score, or cost spikes.
- Synthetic replay: replay saved datasets against staging prompts/models before production rollout.
- Long-term RAG evaluation: add retrieval-quality scores only after owned product/document retrieval becomes a larger part of assistant answers.

## Suggested Execution Order by Worktree

### Storefront worktree

- Fix the assistant unavailable-product/stale-link launch-gate issue before deeper AI capability work.
- Implement TODO #4.
- Implement TODO #5.
- Implement TODO #6.
- Implement TODO #7.
- Implement TODO #8 after the feedback/annotation loop exists.
- Smoke-test support-ticket and product-document flows after staging deploys.

### Backend worktree

- Re-smoke and harden Karrio selected-rate label purchase only when Karrio carrier labels are enabled for launch; manual fulfillment remains the safe fallback.
- Handle TODO #0 backend/CMS dependency upgrades in a dedicated security PR.
- Add any indexing/sync hooks needed for TODO #2.

## Validation Checklist (each PR)

1. Unit/integration tests pass.
2. Lint and typecheck pass.
3. Key routes return expected status codes.
4. Meilisearch live checks validate expected indexes/doc counts.
5. No placeholder/dead links.
