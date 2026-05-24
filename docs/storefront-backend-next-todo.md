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

## Remaining TODO (Priority Order)

### 1) Add `/collections` landing page (Storefront)

- Problem: homepage links to `/collections`, but only `/collections/[handle]` exists.
- Deliverable:
  - Create `/collections` index route.
  - List collections from Medusa.
  - Overlay Strapi collection content (title/description/image) by `Handle`.
  - Provide empty/error states consistent with listing pages.
- Acceptance:
  - `/collections` returns `200`.
  - No broken internal links from homepage.

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

### 4) Launch Medusa-native support tickets with AI handoff (Backend + Storefront + Admin + AI)

- Status: In implementation for the launch-minimum support workflow.

- Problem: current support form opens an email draft; no tracking/workflow, and the AI chatbot needs a safe path to hand a customer to a human without creating a separate support system.
- Deliverable:
  - Medusa support-ticket module for tickets, messages, and audit events.
  - Storefront contact form submits to `/api/support-tickets` and displays success/error states with a ticket number.
  - Admin support-ticket list/detail pages for triage, status updates, internal notes, and customer replies.
  - AI handoff endpoint at `/ai/support-ticket`, protected by `x-3db-internal-token`, accepting customer details, AI summary, optional verified order/product context, and transcript excerpt only when the customer consent flag is true.
  - Notification integration for customer acknowledgements, internal alerts, and customer-visible support replies.
- Acceptance:
  - Form submits without email client dependency.
  - Requests are persisted, auditable, and visible in Medusa Admin.
  - AI chatbot can create a human handoff ticket by calling the internal endpoint instead of inventing a parallel queue.
  - Transcript context is omitted unless `consent_to_include_transcript` is explicitly true.
- Deferred after launch:
  - External OSS helpdesk sync, if Medusa Admin becomes too thin for support workload.
  - Customer account ticket history and threaded customer replies from the storefront.
  - SLA dashboards, assignment queues, tags, saved views, and attachment uploads.

### 5) Move remaining static Help/Guides blocks to CMS (Storefront + CMS)

- Problem: category/popular-resource blocks are still hardcoded.
- Deliverable:
  - Define/reuse Strapi types for Help/Guides block content.
  - Render page sections from CMS with robust fallbacks.
- Acceptance:
  - Content team can update Help/Guides without code changes.
  - Page remains stable if CMS fields are missing.

## Suggested Execution Order by Worktree

### Storefront worktree

- Implement TODO #1 and #5.
- Integrate API contract for TODO #4 client submission flow.

### Backend worktree

- Implement TODO #4 backend endpoint + validations + tests.
- Add any indexing/sync hooks needed for TODO #3.

## Validation Checklist (each PR)

1. Unit/integration tests pass.
2. Lint and typecheck pass.
3. Key routes return expected status codes.
4. Meilisearch live checks validate expected indexes/doc counts.
5. No placeholder/dead links.
