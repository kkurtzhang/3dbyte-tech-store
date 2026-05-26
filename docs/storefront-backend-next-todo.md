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
- Phase 1 AI-ready realistic products technical staging bring-up is complete: 29 `ai-*` products, 6 public product documents, product/document Meilisearch sync, Download Center search, product-page downloads, and assistant smoke prompts have been verified on staging.

## Remaining TODO (Priority Order)

### 0) Security dependency upgrade pass (All apps)

- Problem: `pnpm audit` currently reports high/critical advisories across CMS, backend, storefront, and root tooling. The audit does not currently block builds or CI because CI runs it with `continue-on-error`, but the advisories should be handled before wider staging/product-data work.
- Current audit targets:
  - Upgrade Strapi packages from `5.33.0` toward the latest compatible `5.46.x` line.
  - Upgrade Next.js from `16.1.0` toward `16.2.6+`.
  - Review Medusa packages from `2.13.3` toward the latest compatible `2.15.x` line.
  - Review Nodemailer `6.10.1` advisories; plan carefully because latest major is `8.x`.
  - Upgrade root Turbo from `^2.6.3` toward `2.9.14+`.
- Acceptance:
  - `pnpm audit --audit-level=high` is clean, or any remaining advisories have explicit risk acceptance notes with owner/date.
  - CMS, backend, and storefront builds pass after upgrades.
  - Strapi admin/content APIs, Medusa backend, storefront core routes, and Meilisearch sync paths are smoke-tested.
  - Lockfile changes are reviewed separately from feature work.

### 1) Complete AI-ready realistic product content polish (Medusa + CMS + Search)

- Status: Phase 1 technical path is live on staging, but content depth is intentionally thin.
- Deliverable:
  - Add Strapi rich descriptions for all 29 `ai-*` products.
  - Expand product-document coverage beyond the initial 6 docs.
  - Replace seeded placeholder media with realistic product-source media.
  - Re-sync product documents after each content batch.
- Acceptance:
  - Product pages look credible without placeholder-heavy content.
  - Download Center has useful manual/datasheet/SDS/install/warranty coverage for common product questions.
  - Assistant answers are grounded in product metadata plus documents, not generic filler.

### 2) Expand Strapi collection content coverage (CMS Content)

- Problem: Strapi currently has sparse collection rows and handle mismatches.
- Deliverable:
  - Ensure each Medusa collection has matching Strapi `collections.Handle`.
  - Populate `Title`, `Description`, and `Image`.
- Acceptance:
  - Overlay appears on homepage cards and collection detail pages.
  - Fallback path still works if a collection has no Strapi row.

### 3) Increase indexed blog content for Help/Guides search (CMS + Search)

- Problem: Meilisearch `blog` index has too few documents, limiting search quality.
- Deliverable:
  - Publish additional guide/help posts in Strapi.
  - Re-sync to Meilisearch `blog` index.
- Acceptance:
  - `blog` index has meaningful volume.
  - `/api/content-search` returns relevant article/guide hits for common queries.

### 4) Harden support-ticket workflow after launch (Backend + Storefront + Admin + AI)

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

### 5) Harden AI assistant product-link grounding (Storefront + Backend)

- Problem: Live staging assistant responses can ground product recommendations correctly but may label seeded placeholder image URLs as "View product" links when the tool context does not provide an explicit storefront product URL.
- Deliverable:
  - Include canonical storefront product URLs in AI product guidance context, or render assistant product cards from structured tool output instead of model-authored links.
  - Update the assistant prompt/tests so product links must use `/products/{handle}` or no link.
- Acceptance:
  - Assistant product recommendations link to route-valid product pages.
  - Placeholder image URLs are never presented as product navigation links.
  - Existing support-ticket confirmation guardrails remain intact.

### 6) Move remaining static Help/Guides blocks to CMS (Storefront + CMS)

- Problem: category/popular-resource blocks are still hardcoded.
- Deliverable:
  - Define/reuse Strapi types for Help/Guides block content.
  - Render page sections from CMS with robust fallbacks.
- Acceptance:
  - Content team can update Help/Guides without code changes.
  - Page remains stable if CMS fields are missing.

## Suggested Execution Order by Worktree

### Storefront worktree

- Implement TODO #5.
- Implement TODO #6.
- Smoke-test support-ticket and product-document flows after staging deploys.

### Backend worktree

- Handle TODO #0 backend/CMS dependency upgrades in a dedicated security PR.
- Add any indexing/sync hooks needed for TODO #3.
- Support TODO #1 content/document seeding as richer product source material becomes available.

## Validation Checklist (each PR)

1. Unit/integration tests pass.
2. Lint and typecheck pass.
3. Key routes return expected status codes.
4. Meilisearch live checks validate expected indexes/doc counts.
5. No placeholder/dead links.
