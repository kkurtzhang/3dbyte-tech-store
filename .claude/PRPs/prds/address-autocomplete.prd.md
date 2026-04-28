# Address Autocomplete for eStore Checkout

## Problem Statement

Customers filling out shipping addresses during checkout must manually type every field (street, suburb, state, postcode) without assistance, leading to typos, invalid addresses, and failed courier deliveries. Aramex AU/NZ (via Karrio) rejects malformed addresses, causing fulfillment delays and increased support tickets. No address autocomplete exists today, and third-party APIs (Google Places, AddressFinder) introduce recurring costs and external dependencies that conflict with the self-hosted architecture.

## Evidence

- The current `address-step.tsx` uses plain `<Input>` fields with zero autocomplete or validation — customers can submit any string.
- Karrio/Aramex integration (in progress on `feat+karrio-shipping` branch) requires precise, formatted addresses for rate calculation and label generation.
- The Meilisearch infrastructure is already deployed and battle-tested for product/category/brand search — adding an address index is incremental, not greenfield.
- OpenAddresses `au/countrywide.json` confirmed via API to source from G-NAF (the authoritative Australian government address database), providing a pre-flattened CSV of ~15M addresses.

## Proposed Solution

Add a new `addresses` index to the existing Meilisearch instance, populated by a Medusa scheduled job that downloads the pre-flattened G-NAF CSV from OpenAddresses (AU) and LINZ CSV (NZ), streams the data into Meilisearch using zero-downtime index swapping, and exposes a new storefront API route. The Next.js checkout `address-step.tsx` gains a type-ahead autocomplete input that queries Meilisearch directly (via the existing `searchClient`), auto-filling suburb, state, and postcode fields on selection.

This approach was chosen over:
- **Google Places API**: Recurring per-request cost, external dependency.
- **Photon/Pelias (self-hosted geocoder)**: Additional Docker container, separate Elasticsearch instance — over-engineered for text autocomplete.
- **Building from raw G-NAF PSV files**: Requires complex SQL joins across 15+ tables; OpenAddresses already does this for us.
- **Mixed data sources (OpenAddresses + state gov portals)**: Inconsistent formatting, high maintenance, only $1/yr cheaper.

## Key Hypothesis

We believe **instant address autocomplete in checkout** will **reduce invalid-address fulfillment failures and improve checkout completion rates** for **AU/NZ customers**.
We'll know we're right when **Karrio address-validation rejection rate drops below 2%** and **average checkout completion time decreases by 15%+**.

## What We're NOT Building

- **Global address coverage** — AU/NZ only (matching our Karrio shipping regions). Can expand later.
- **Address validation/verification** — We autocomplete to reduce errors, but we don't block submission of manually typed addresses. Karrio handles final validation.
- **Geolocation-based suggestions** — No "use my current location" feature in v1.
- **Admin panel address management** — Backend data pipeline is fully automated; no admin UI for address data.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Karrio address rejection rate | < 2% | Karrio API error logs in Medusa |
| Checkout step 1 (address) completion time | -15% vs baseline | Analytics event timing |
| Address autocomplete usage rate | > 60% of checkouts | Frontend event tracking |
| Meilisearch address search latency (p95) | < 50ms | Meilisearch dashboard |
| Data pipeline success rate | 100% (quarterly) | Scheduled job logs |

## Open Questions

- [ ] Should we expose a public Meilisearch search key for the `addresses` index (client-side) or proxy through a Next.js API route (server-side)?
- [ ] What is the acceptable staleness window? OpenAddresses re-processes G-NAF quarterly — is monthly sync sufficient?
- [ ] Should NZ (LINZ) data be included in v1 or deferred to v1.1?
- [ ] How should the autocomplete behave for unit/apartment addresses (e.g., "Unit 4/12 Main St")?

---

## Users & Context

**Primary User**
- **Who**: An AU/NZ online shopper purchasing 3D printing equipment/supplies.
- **Current behavior**: Manually types full address into 5 separate form fields. Often abbreviates incorrectly ("Syd" instead of "Sydney"), omits postcode, or uses non-standard street suffixes.
- **Trigger**: Reaching the "Shipping Address" step of checkout.
- **Success state**: Types 3-5 characters of their street, sees their full address in a dropdown, selects it, and all fields auto-populate correctly.

**Job to Be Done**
When **I'm checking out and need to enter my shipping address**, I want to **type a few characters and select my address from a dropdown**, so I can **complete checkout faster and be confident my order will arrive**.

**Non-Users**
- International (non-AU/NZ) customers — their address data is not in scope for v1.
- Admin/store operators — they don't use checkout; address data management is automated.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Meilisearch `addresses` index with G-NAF data | Core data layer — everything depends on this |
| Must | Medusa scheduled job for automated data sync | Data must stay current without manual intervention |
| Must | Zero-downtime index swap during sync | Checkout must never go offline during data refresh |
| Must | Storefront autocomplete input component | The user-facing feature that delivers value |
| Must | Auto-fill suburb, state, postcode on selection | Eliminates the most common error-prone fields |
| Should | NZ address data (LINZ) in same pipeline | Complete AU/NZ coverage for Karrio |
| Should | Debounced search (300ms) | Prevents excessive Meilisearch queries while typing |
| Could | "Recent addresses" from localStorage | Returning customers skip autocomplete entirely |
| Could | Highlight matching text in dropdown results | UX polish for search results |
| Won't | Address verification/blocking | Karrio handles validation; we only assist, not enforce |
| Won't | Global address data | Out of scope; AU/NZ only for now |

### MVP Scope

The minimum to validate the hypothesis:
1. A Meilisearch `addresses` index populated with AU G-NAF data from OpenAddresses.
2. A Medusa scheduled job that refreshes the index monthly.
3. A new autocomplete `<Input>` in `address-step.tsx` that searches the index and auto-fills fields.

### User Flow

```
1. Customer reaches Checkout -> Address Step
2. Types into "Street Address" field (e.g., "12 Main")
3. After 3+ characters, debounced search fires against Meilisearch `addresses` index
4. Dropdown appears with matching addresses (e.g., "12 Main St, Sydney NSW 2000")
5. Customer selects an address
6. Fields auto-populate: address_1, city, postal_code, country_code
7. Customer proceeds to "Continue to Delivery"
```

---

## Technical Approach

**Feasibility**: **HIGH**

This project leverages almost entirely existing infrastructure. The Meilisearch module, scheduled job pattern, shared types, and storefront search client all exist and are battle-tested.

**Architecture Notes**

- **Meilisearch Module** (`service.ts`): Already supports multiple index types (`product | category | brand`). Adding `"address"` to the `MeilisearchIndexType` union and extending the service is a small, well-understood change.
- **Scheduled Jobs** (`sync-meilisearch-settings.ts`): Existing pattern for cron-based Meilisearch operations. The address sync job follows the same structure.
- **Storefront Search Client** (`client.ts`): Already initialized with Meilisearch host/key. Adding `INDEX_ADDRESSES = "addresses"` is trivial.
- **Shared Types** (`meilisearch.ts`): Well-structured type definitions. A new `MeilisearchAddressDocument` interface fits naturally.
- **Data Source**: OpenAddresses `au/countrywide` — pre-flattened CSV sourced from G-NAF. Download URL is in their GitHub source config: `https://f001.backblazeb2.com/file/alantgeo-public/au-feb2026.zip`. The pipeline must discover the latest URL programmatically.

**Data Pipeline Architecture**

```
+------------------------------------------------------------------+
|  EventBridge / Medusa Scheduled Job (Monthly cron)               |
+-------------------------------+----------------------------------+
                                | Triggers
                                v
+------------------------------------------------------------------+
|  Step 1: DISCOVER                                                |
|  Fetch au/countrywide.json from OpenAddresses GitHub             |
|  Extract latest download URL from `layers.addresses[0].data`     |
|  Also fetch NZ LINZ CSV URL                                     |
+-------------------------------+----------------------------------+
                                v
+------------------------------------------------------------------+
|  Step 2: DOWNLOAD & EXTRACT                                     |
|  Download .zip to /tmp, extract CSV                              |
|  ~15M rows AU + ~2M rows NZ                                     |
+-------------------------------+----------------------------------+
                                v
+------------------------------------------------------------------+
|  Step 3: STREAM & TRANSFORM                                     |
|  csv-parser streams rows -> MeilisearchAddressDocument JSON      |
|  Batch into arrays of 5,000                                     |
+-------------------------------+----------------------------------+
                                v
+------------------------------------------------------------------+
|  Step 4: LOAD (Zero-Downtime)                                   |
|  Create temp index `addresses_temp_{timestamp}`                  |
|  Push batches via Meilisearch SDK                                |
|  Configure searchable/filterable/displayed attributes            |
+-------------------------------+----------------------------------+
                                v
+------------------------------------------------------------------+
|  Step 5: SWAP & CLEANUP                                         |
|  Call Meilisearch Swap Indexes API                               |
|  Delete old index and /tmp files                                 |
+------------------------------------------------------------------+
```

**Technical Risks**

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| 15M-row CSV exhausts Medusa server memory | Medium | Use Node.js Streams (csv-parser) — never load full file into memory |
| OpenAddresses download URL changes without notice | Low | Programmatically parse `countrywide.json` from GitHub for the URL each run |
| Meilisearch disk usage spikes with 15M+ docs | Medium | Configure displayed attributes to exclude lat/lon; monitor disk; address index is ~3-5GB |
| Long sync job blocks Medusa event loop | Medium | Run in a Medusa worker or separate ECS Fargate task for production |
| OpenAddresses G-NAF data becomes stale or drops states | Low | Monitor row count after each sync; alert if < 14M (expected minimum) |

---

## Implementation Phases

<!--
  STATUS: pending | in-progress | complete
  PARALLEL: phases that can run concurrently (e.g., "with 3" or "-")
  DEPENDS: phases that must complete first (e.g., "1, 2" or "-")
  PRP: link to generated plan file once created
-->

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Shared Types & Meilisearch Module | Add `"address"` index type, address document interface, index settings | complete | - | - | `plans/address-autocomplete-phase1-types-module.plan.md` |
| 2 | Data Pipeline (Backend Job) | Scheduled job: discover → download → stream → push → swap | complete | - | 1 | `plans/address-autocomplete-phase2-data-pipeline.plan.md` |
| 3 | Backend API Route | Expose `/store/addresses/autocomplete?q=` endpoint | complete | with 4 | 1 | `plans/address-autocomplete-phase3-api-route.plan.md` |
| 4 | Storefront Autocomplete Component | Type-ahead input in checkout address-step with auto-fill | complete | with 3 | 1 | `plans/address-autocomplete-phase4-storefront-component.plan.md` |
| 5 | Testing & Polish | Unit tests, integration tests, E2E checkout flow, debounce tuning | complete | - | 3, 4 | `plans/address-autocomplete-phase5-testing-polish.plan.md` |

### Phase Details

**Phase 1: Shared Types & Meilisearch Module**
- **Goal**: Extend existing infrastructure to support an `addresses` index.
- **Scope**:
  - Add `"address"` to `MeilisearchIndexType` union in `packages/shared-types`
  - Create `MeilisearchAddressDocument` interface
  - Add `addressIndexName` to `MeilisearchModuleConfig`
  - Extend `MeilisearchModuleService.getIndexName()` to handle `"address"`
  - Define `ADDRESS_INDEX_SETTINGS` (searchable: `full_address`, `street`, `suburb`; filterable: `state`, `postcode`; displayed: all fields)
  - Add a loader `configure-address-index.ts`
- **Success signal**: Backend compiles, new index type is recognized, settings loader runs on startup.

**Phase 2: Data Pipeline (Backend Job)**
- **Goal**: Fully automated, zero-downtime address data ingestion.
- **Scope**:
  - Create `src/jobs/sync-addresses.ts` with monthly cron
  - Implement discovery step (fetch `countrywide.json` from GitHub API)
  - Implement download + extraction (zip -> csv in `/tmp`)
  - Implement streaming transform (csv-parser -> `MeilisearchAddressDocument`)
  - Implement batch upload to temporary index (5,000 docs/batch)
  - Implement index swap via Meilisearch SDK
  - Implement cleanup (delete temp files, old index)
  - Add row-count health check with alerting
- **Success signal**: Job runs end-to-end, `addresses` index contains ~15M documents, zero checkout downtime during sync.

**Phase 3: Backend API Route**
- **Goal**: Expose a search endpoint the storefront can call.
- **Scope**:
  - Create `src/api/store/addresses/autocomplete/route.ts`
  - Accept `q` query param, optional `limit` (default 8)
  - Proxy to Meilisearch `addresses` index search
  - Return structured results matching `MeilisearchAddressDocument`
  - Add rate limiting
- **Success signal**: `GET /store/addresses/autocomplete?q=12+Main` returns matching addresses.
- **Implementation status**: Complete. The endpoint validates `q`, `limit`, and optional `country`, resolves the Meilisearch module via the registered module token, returns `addresses`, `count`, and `processingTimeMs`, and degrades with a generic 500 response when search is unavailable. Rate limiting remains a future platform concern rather than an endpoint-local implementation.

**Phase 4: Storefront Autocomplete Component**
- **Goal**: Deliver the user-facing type-ahead experience in checkout.
- **Scope**:
  - Create `src/features/checkout/components/address-autocomplete.tsx`
  - Debounced input (300ms) that calls the autocomplete API
  - Dropdown with formatted address results
  - On selection: auto-fill `address_1`, `city` (suburb), `postal_code`, `country_code`
  - Integrate into existing `address-step.tsx` (replace plain `<Input>` for address_1)
  - Handle loading, empty, and error states gracefully
  - Keyboard navigation (arrow keys, enter to select)
- **Success signal**: Customer types "12 Main", sees dropdown, selects address, fields populate.
- **Implementation status**: Complete. Checkout now uses a dedicated `AddressAutocomplete` component with debounced backend search, loading/empty/error states, keyboard navigation, click-outside close behavior, manual-entry fallback, and auto-fill of address, unit, suburb/city, postcode, and country fields.

**Phase 5: Testing & Polish**
- **Goal**: 80%+ coverage, E2E validation, production readiness.
- **Scope**:
  - Unit tests for address document transform logic
  - Unit tests for autocomplete component (RTL)
  - Integration test for the autocomplete API route
  - E2E test: full checkout flow with address autocomplete (Playwright)
  - Performance tuning: debounce timing, result limit, index settings
  - Monitor Meilisearch disk/memory with 15M+ address documents
- **Success signal**: Focused backend and storefront tests green, touched-file coverage above target, live hand-test data available.
- **Implementation status**: Complete for unit/integration coverage and hand-test readiness. E2E Playwright coverage remains deferred per the Phase 5 plan because it depends on a running backend, storefront, and address-populated Meilisearch instance. Live Meilisearch settings were also optimized after initial hand-test indexing to reduce resource usage.

### Parallelism Notes

Phases 3 (Backend API) and 4 (Storefront Component) can run in parallel once Phase 1 is complete, because they only depend on the shared types and index configuration, not on each other. Phase 2 (Data Pipeline) should be started early because the first data sync will take time to validate. Phase 5 depends on both 3 and 4 being complete.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Data source | OpenAddresses countrywide (G-NAF) | Raw G-NAF PSV, OpenStreetMap, state gov portals | Pre-flattened CSV, 100% AU coverage, community-maintained, CC-BY 4.0 license |
| Search engine | Existing Meilisearch instance | Photon, Pelias, Elasticsearch, Typesense | Already deployed, proven in production, typo-tolerant, zero additional infra cost |
| Sync trigger | Medusa scheduled job (monthly cron) | AWS EventBridge + Fargate, manual script | Simplest approach; keeps everything in the monorepo. Can graduate to Fargate if sync is too heavy for the Medusa process |
| Index update strategy | Zero-downtime swap (temp index -> swap -> delete old) | In-place update, full re-index with downtime | Guarantees checkout never loses address search during sync |
| Autocomplete approach | Backend API proxy to Meilisearch | Direct client-side Meilisearch search key | More control over rate limiting, logging, and key security. Open question for optimization later |
| Scope | AU/NZ only | Global | Matches current Karrio/Aramex shipping regions. Expand when new carriers are added |

---

## Research Summary

**Market Context**
- Google Places API and AddressFinder are the dominant solutions for AU/NZ address autocomplete, but both charge per request ($2-5 per 1000 requests). At scale, this adds up to hundreds of dollars/year.
- Shopify, BigCommerce, and other hosted platforms bake in Google Places. Self-hosted solutions like Medusa do not include address autocomplete out of the box.
- The trend in the open-source e-commerce space is to self-host search (Meilisearch, Typesense) and leverage open government datasets to avoid API lock-in.

**Technical Context**
- The 3D Byte Tech Store already has a mature, production-grade Meilisearch integration spanning 3 index types (product, category, brand), scheduled sync jobs, shared types, and a storefront search client.
- The existing `MeilisearchModuleService` is designed for extensibility — adding a 4th index type is a natural extension.
- The `address-step.tsx` uses `react-hook-form` with Zod validation and `setValue()` — programmatic field population on autocomplete selection is straightforward.
- OpenAddresses' `au/countrywide.json` confirms the data URL, format (`csv`), field mapping (`number`, `street`, `unit`, `city`, `postcode`, `region`), and license (CC-BY 4.0 with postal-use restrictions — acceptable for autocomplete, not for mailing lists).

---

## Feasibility Assessment

**Overall Feasibility: HIGH** — This feature is highly feasible because it is an incremental extension of existing, proven infrastructure.

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Technical complexity | Low-Medium | All patterns exist in the codebase; main challenge is streaming 15M rows |
| Infrastructure cost | ~$0/year | Uses existing Meilisearch instance; ~3-5GB additional disk |
| Engineering effort | ~3-5 days | Spread across 5 phases |
| Data availability | Confirmed | OpenAddresses AU countrywide + LINZ NZ both freely available |
| Risk level | Low | Worst case: address search is temporarily unavailable; checkout still works with manual entry |

## Improvement Recommendations

1. **Graduate to AWS Fargate for the sync job** — If the 15M-row CSV processing is too heavy for the Medusa Node.js process (blocking the event loop), extract the pipeline into a standalone Docker container triggered by AWS EventBridge. This is the architecture we discussed in detail during our conversation.

2. **Client-side search key** — Instead of proxying every keystroke through the Medusa backend API, consider generating a read-only Meilisearch search key scoped to the `addresses` index. The storefront already has `NEXT_PUBLIC_MEILISEARCH_HOST` and `NEXT_PUBLIC_MEILISEARCH_API_KEY` configured — this would eliminate the backend hop entirely and reduce latency.

3. **Differential sync** — Instead of re-downloading the entire 15M-row CSV monthly, compare the file hash or `Last-Modified` header. If unchanged, skip the sync entirely. This saves bandwidth and processing time.

4. **Address popularity ranking** — Meilisearch supports custom ranking rules. If you track which addresses are selected most often (anonymous counter), you can boost popular addresses to the top of autocomplete results, improving relevance for your specific customer base.

5. **Postcode-first search** — Many AU customers type their postcode first. Consider adding a secondary search mode that filters by postcode and then searches within that region, dramatically reducing result sets and improving relevance.

---

*Generated: 2026-04-26T09:08:32+10:00*
*Updated: 2026-04-28*
*Status: IMPLEMENTED - Phase 3-5 documentation backfilled from commits*
