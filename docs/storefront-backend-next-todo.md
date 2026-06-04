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

## Remaining TODO (Priority Order)

### Launch-gate security: Public order lookup returned payment provider payloads (Backend)

- Found: `2026-06-03` staging launch gate while verifying `3DBO-AKK7-5KYYDE` tracking lookup.
- Status: fixed on staging in merge commit `a332235`; staging lookup smoke passed with tracking labels present and payment provider payloads absent.
- Problem: `/store/orders/lookup` requested and returned `payment_collections.payments.data`, which exposed provider-specific Stripe PaymentIntent details in a customer-facing order lookup response.
- Acceptance:
  - Public order lookup does not request payment provider data from the Medusa graph query.
  - Public order lookup strips payment collection payloads even if upstream graph data unexpectedly includes them.
  - Order tracking still shows order status, fulfillment status, items, addresses, totals, and tracking labels.
  - Regression tests fail if payment provider data is requested or returned.

### Launch-gate follow-up: Account signup email confirmation/verification (Storefront + Backend + Email)

- Found: `2026-06-03` staging launch gate during logged-in checkout smoke.
- Problem: the test account was registered with a plus-address (`bucco.max.org+launchgate...@gmail.com`) instead of the intended base inbox address, so the gate did not clearly prove whether the customer signup flow sends or requires an email confirmation/verification message.
- Product decision needed: decide whether new customer accounts should require email verification before checkout/account access, or whether signup should only send a welcome/acknowledgement email.
- Acceptance:
  - Staging signup smoke uses an inbox address that the gate operator can clearly identify and search.
  - Expected signup email behavior is documented: verification required, welcome-only, or intentionally no email.
  - If verification is required, unverified accounts cannot access protected account actions until verified.
  - If verification is not required, the launch gate explicitly verifies the chosen welcome/acknowledgement behavior.

### Launch-gate bug: Logged-in customer order history misses newly placed orders (Storefront + Backend)

- Found: `2026-06-03` staging launch gate on logged-in order `3DBO-AKK7-5KYYDE` / `order_01KT6NYPSV6D65VVXZ4Z4XAVPP`.
- Status: fixed on staging in merge commit `c82fb52`; staging re-smoke passed. `/account/orders` lists the logged-in order as shipped and `/account/orders/order_01KT6NYPSV6D65VVXZ4Z4XAVPP` shows `3DBO-AKK7-5KYYDE`, `Shipped`, and tracking `STG-3DBO-AKK7-5KYYDE`.
- Problem: the order confirmation page and Medusa Admin show the order was placed by the logged-in customer `bucco.max.org+launchgate...@gmail.com`, but `/account/orders` still renders "No Orders Yet" while the same browser session is logged in.
- Evidence:
  - Confirmation page showed `My Account` / `Sign Out` and order ref `3DBO-AKK7-5KYYDE`.
  - Medusa Admin order `#14` linked the customer record `Launch Gate` / `bucco.max.org+launchgate...@gmail.com`.
  - Storefront account order-history page remained authenticated but did not list the order.
- Acceptance:
  - A logged-in checkout order appears in `/account/orders` without manual admin intervention.
  - The order detail link from account history opens the correct customer-visible order detail.
  - Guest order tracking still works independently via `/track-order`.
  - Regression tests cover the customer-order lookup path used by the account page.

### Launch-gate bug: Account address add form silently fails (Storefront + Backend)

- Found: `2026-06-03` staging launch gate on logged-in test account `bucco.max.org+launchgate...@gmail.com`.
- Status: follow-up in branch `fix/account-address-page-form` replaces the slide-over sheet with URL-driven inline add/edit panels, keeps API errors visible in the form, refreshes the account page after successful saves, and adds focused address form/page regression tests. Full address save/delete re-smoke still needs staging browser confirmation after this branch deploys.
- Problem: `/account/addresses` opens the add-address form and accepts valid input values, but after `Save Address` the modal closes, no error is shown, and the page still shows "No saved addresses yet".
- Evidence:
  - Form values before save included `first_name: "LAUNCH"`, `last_name: "GATE"`, `address_1: "32 KIERNAN ST"`, `city: "GWYNNEVILLE"`, `postal_code: "2500"`, `country_code: "AU"`, and `phone: "0400000000"`.
  - After save, the dialog closed, no browser console error was captured, and the empty-state remained visible.
- Acceptance:
  - Adding a valid address from `/account/addresses` persists it to the logged-in customer.
  - The newly saved address appears immediately without requiring a full logout/login cycle.
  - Invalid address saves keep the modal open and show a customer-visible error.
  - Regression tests cover add-address success and validation failure states.

### Launch-gate bug: Fulfillment shipment notification email is not sent (Backend + Email)

- Found: `2026-06-03` staging launch gate on logged-in order `3DBO-AKK7-5KYYDE` / `order_01KT6NYPSV6D65VVXZ4Z4XAVPP`.
- Status: fixed on staging in merge commit `c82fb52`; staging shipment-email smoke passed. Re-emitting `shipment.created` for fulfillment `ful_01KT6P4EWRZXKTQ5AJWTZNBQ9M` processed one subscriber and Gmail received "Your 3D Byte Tech order 3DBO-AKK7-5KYYDE has shipped" at 23:55 on `2026-06-03`.
- Problem: Medusa Admin manual fulfillment was created and then marked shipped with `Send notification` enabled, but Gmail still showed only the original order-confirmation email after the shipment action.
- Evidence:
  - Admin order `#14` payment was captured, fulfillment provider was `Manual`, and shipment was saved with tracking number `STG-3DBO-AKK7-5KYYDE`.
  - Admin activity showed `Items shipped`.
  - Gmail search for `3DBO-AKK7-5KYYDE` still returned `1-1` result: only "Your 3D Byte Tech order 3DBO-AKK7-5KYYDE is confirmed".
  - The original order confirmation email tells the customer "We will send another email when the order is on its way", so the current customer promise is not being met.
- Acceptance:
  - Marking a fulfillment as shipped with `Send notification` enabled sends a shipment/on-the-way email.
  - The shipment email includes order reference, shipped item(s), carrier/provider where available, and tracking number/link when present.
  - Staging email smoke verifies both the order confirmation and shipment notification paths.

### Launch-gate bug: Customer order tracking does not reflect shipped fulfillment (Storefront + Backend)

- Found: `2026-06-03` staging launch gate on order `3DBO-AKK7-5KYYDE` / `order_01KT6NYPSV6D65VVXZ4Z4XAVPP`.
- Status: fixed on staging in merge commits `c82fb52`, `a332235`, and `d82104c`; staging lookup smoke passed. Public lookup for `3DBO-AKK7-5KYYDE` returns `fulfillment_status: shipped`, tracking label `STG-3DBO-AKK7-5KYYDE`, and no payment provider payloads.
- Problem: after Medusa Admin marked the manual fulfillment as shipped with tracking number `STG-3DBO-AKK7-5KYYDE`, the customer `/track-order` result still showed `Pending`, `Processing`, and "waiting for fulfillment" with no tracking number.
- Evidence:
  - Admin order showed fulfillment `Shipped`, provider `Manual`, tracking `STG-3DBO-AKK7-5KYYDE`, and activity `Items shipped`.
  - Storefront tracking lookup for `3DBO-AKK7-5KYYDE` plus the checkout email returned the order, but displayed `Fulfillment: Processing` and no tracking data.
- Acceptance:
  - Customer order tracking reflects fulfilled/shipped states from Medusa.
  - Tracking numbers/URLs are shown when present.
  - Pending, fulfilled, shipped, and delivered states have distinct customer-facing copy.
  - Regression tests cover order tracking after fulfillment shipment creation.

### Launch-gate bug: Karrio checkout delivery options send stale service filters (Backend + Shipping)

- Found: `2026-06-04` staging checkout gate on the delivery-method step.
- Status: stale filter bug fixed in PR #147; Karrio carrier-message fallback being fixed in branch `fix/karrio-live-rate-message-fallback`.
- Problem: Medusa calculated shipping option pricing called Karrio `/v1/proxy/rates` with stale default option filters such as `carrier_ids: ["aramex"]` and `services: ["aramex_priority"]`. Karrio returned `404 not_found`: "No active carrier connection found to process the request" even though live unfiltered rate shopping could return active Aramex AU/NZ rates.
- Evidence:
  - Karrio request body included `carrier_ids: ["aramex"]`, `services: ["aramex_priority"]`, parcels, sender, and recipient.
  - Karrio response body returned `errors[0].code: "not_found"` and `message: "No active carrier connection found to process the request"`.
  - On `2026-06-04`, Karrio also returned `424` carrier messages for Aramex AU/NZ on a WA lane with `code: "SHIPPING_SDK_INTERNAL_ERROR"` and `message: "'NoneType' object has no attribute 'sLACode'"`.
  - Direct probe from `oci-app` using the staging Medusa container env confirmed:
    - NSW unfiltered `/v1/proxy/rates` returns two Aramex rates.
    - WA unfiltered `/v1/proxy/rates` and WA draft `/v1/shipments` both return the Aramex `sLACode` carrier message.
    - WA filtered `/v1/proxy/rates` returns the stale-filter `404 not_found`.
  - Aramex public Fastlabel tooling recognizes `BICKLEY 6076 WA` under the Perth regional franchise and can quote a `PER -> Bickley 6076` sample parcel, so the current WA failure appears to be a Karrio/Aramex connector or account mapping issue rather than obvious Aramex public-network non-coverage.
  - Follow-up probe on `2026-06-04` confirmed `Kingston TAS 7050`, `Barangaroo NSW 2000`, and `Gnangara WA 6077` return Karrio Aramex rates from the staging server, while `Armidale NSW 2350` returns the same `sLACode` carrier message.
  - Public Aramex Fastlabel data recognizes `ARMIDALE 2350 NSW`, but the `TAS -> Armidale 2350` quote differs from working lanes: delivery franchise is `Aramex Regional Network`, delivery time is blank, and options are satchel-only national options rather than parcel label options. This likely explains why Karrio's Aramex connector is missing `sLACode` for that lane.
  - AramexConnect reference repo/wiki (`mindfulsoftware/myFastway.ApiClient`) documents direct OAuth client-credentials auth plus coverage/SLA endpoints such as `/api/addresses/serviced-by` and `/api/location`; those are good candidates for a future direct Aramex coverage probe once AramexConnect API credentials are available.
  - Existing storefront live-rate route already requests `/v1/proxy/rates` without carrier/service filters and maps the returned live rates to customer-facing delivery options.
- Real-world practice:
  - Rate-shop active carrier connections first and select among the returned rates instead of treating Medusa shipping-option defaults as authoritative Karrio service ids.
  - Use Karrio's selected-rate purchase flow (`/v1/proxy/shipments` with `selected_rate_id`) when creating labels for a rate chosen during checkout.
  - Treat Karrio carrier/service discovery as configuration/admin tooling: query active Karrio carrier connections/services where possible, then seed or refresh Medusa shipping options from that data instead of relying on long-lived hardcoded service names.
  - If Karrio continues to hide Aramex-specific diagnostics, add a direct AramexConnect health/coverage adapter for admin diagnostics only, using `/api/addresses/serviced-by` for network coverage and `/api/location` for delivery SLA metadata before relying on rate or label purchase flows.
- Acceptance:
  - Checkout delivery options do not fail when static Medusa option data has stale `carrier_id` or `service` values.
  - Karrio rate calculation requests omit stale `carrier_ids` and `services` filters unless they are known-current Karrio connection/service identifiers.
  - The selected returned rate still controls customer-facing price, service label, and later label purchase metadata.
  - Regression tests fail if calculated shipping option pricing sends stale option `carrier_id` or `service` filters to Karrio.
  - Karrio carrier messages from `/v1/proxy/rates` do not surface as raw checkout errors; checkout falls back to fixed/manual delivery options when available.

### Launch-gate bug: Karrio selected-rate fulfillment mapping (Backend + Shipping)

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

- Problem: `pnpm audit` currently reports high/critical advisories across CMS, backend, storefront, and root tooling. The audit does not currently block builds or CI because CI runs it with `continue-on-error`, but the advisories should be handled before wider staging/product-data work.
- Last checked: `2026-05-31` on `feature/langfuse-assistant-tracing`; `pnpm audit --audit-level high` reported 228 total advisories, including 9 critical and 96 high, so this remains a dedicated security-upgrade PR rather than part of assistant tracing.
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

- Status: Langfuse Prompt Management, deterministic score publishing, assistant session grouping, cache-aware usage, and sanitized trace input/output are implemented. LLM-as-judge remains a follow-up after deterministic eval scores and human feedback are visible and trusted.
- Problem: dashboard-managed prompts and Langfuse judge scores are useful for prompt iteration, but they should not replace code-owned safety constraints or deterministic release gates.
- Deliverable:
  - Keep assistant tone/format wording in Langfuse Prompt Management with `staging` and `production` labels.
  - Keep hard assistant guardrails in code and append them after any dashboard-managed prompt.
  - Publish deterministic eval scores to Langfuse sessions for prompt-label comparisons.
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

- Implement TODO #4.
- Implement TODO #5.
- Implement TODO #6.
- Implement TODO #7.
- Implement TODO #8 after the feedback/annotation loop exists.
- Smoke-test support-ticket and product-document flows after staging deploys.

### Backend worktree

- Handle TODO #0 backend/CMS dependency upgrades in a dedicated security PR.
- Add any indexing/sync hooks needed for TODO #2.

## Validation Checklist (each PR)

1. Unit/integration tests pass.
2. Lint and typecheck pass.
3. Key routes return expected status codes.
4. Meilisearch live checks validate expected indexes/doc counts.
5. No placeholder/dead links.
