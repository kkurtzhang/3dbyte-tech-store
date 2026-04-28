# Implementation Report: Address Autocomplete — Phase 2: Data Pipeline

## Summary
Created the complete address data ingestion pipeline: a monthly scheduled job discovers the latest AU countrywide GeoJSON.gz from OpenAddresses batch API, streams it through zlib+readline, transforms each GeoJSON Feature into a MeilisearchAddressDocument, batches documents, and performs a zero-downtime index swap.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Large | Large |
| Files Changed | 4 CREATE, 1 UPDATE | 6 CREATE, 1 UPDATE |
| Dependencies | csv-parser, adm-zip | None (Node.js built-ins only) |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | Create pipeline types | ✅ Complete | |
| 2 | Create discover module | ✅ Complete | Added env var override + API token support |
| 3 | Create ingest module | ✅ Complete | Deviated — see below |
| 4 | Create scheduled job | ✅ Complete | |
| 5 | Add env vars | ✅ Complete | Added OPENADDRESSES_API_TOKEN to template |
| 6 | Write unit tests | ✅ Complete | 15 tests across 2 files |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis | ✅ Pass | Zero new errors |
| Unit Tests | ✅ Pass | 63 tests total (15 new), 16 suites |
| Build | ✅ Pass | Backend build successful |
| Integration | N/A | Requires running Meilisearch + real data |

## Files Changed

| File | Action | Lines |
|---|---|---|
| `apps/backend/src/lib/address-pipeline/types.ts` | CREATED | +87 |
| `apps/backend/src/lib/address-pipeline/discover.ts` | CREATED | +131 |
| `apps/backend/src/lib/address-pipeline/ingest.ts` | CREATED | +258 |
| `apps/backend/src/jobs/sync-addresses.ts` | CREATED | +82 |
| `apps/backend/src/lib/address-pipeline/__tests__/transform.unit.spec.ts` | CREATED | +122 |
| `apps/backend/src/lib/address-pipeline/__tests__/discover.unit.spec.ts` | CREATED | +39 |
| `apps/backend/.env.template` | UPDATED | +5 |

## Deviations from Plan

### 1. GeoJSON.gz instead of CSV (MAJOR)
- **WHAT**: Changed data format from CSV-in-ZIP to GeoJSON Lines in .gz
- **WHY**: OpenAddresses CSV downloads require a donation/subscription. GeoJSON.gz (`source.geojson.gz`) is freely accessible via public S3 bucket.
- **IMPACT**: Eliminated `csv-parser` and `adm-zip` dependencies entirely. Uses Node.js built-in `zlib` and `readline` instead. Simpler pipeline.

### 2. require() instead of import for meilisearch SDK
- **WHAT**: Used `require("meilisearch")` with `any`-typed index
- **WHY**: The `meilisearch` npm package is ESM-only, but the Medusa backend compiles to CJS. The existing `service.ts` already uses this pattern with manually defined interfaces. Following the established pattern avoids ESM/CJS import errors.

### 3. No waitForTask on batch flushes
- **WHAT**: Batch document pushes don't wait for task completion
- **WHY**: Matching the existing service.ts pattern — Meilisearch processes tasks asynchronously. Waiting for each batch would dramatically slow the pipeline. The swap operation implicitly waits for all prior tasks.

### 4. OpenAddresses API token support
- **WHAT**: Added `OPENADDRESSES_API_TOKEN` env var with Bearer auth header
- **WHY**: User provided an API token. Discovery API calls include it as optional Authorization header.

## Issues Encountered

1. **Meilisearch SDK v0.54 API changes**: `waitForTask` is on `client.tasks`, not `client` directly. `EnqueuedTaskPromise` requires calling `.waitTask()` without intermediate `await`. Resolved by using `require()` pattern with `any` types matching existing service.ts.

2. **IndexSwap type requires `rename` field**: v0.54 SDK requires `rename: boolean` on `IndexSwap`. Set to `false` for content swap (not rename).

## Tests Written

| Test File | Tests | Coverage |
|---|---|---|
| `__tests__/transform.unit.spec.ts` | 10 tests | transformFeature: normal, empty unit, missing hash, whitespace, all-empty |
| `__tests__/discover.unit.spec.ts` | 5 tests | s3ToHttps: valid conversion, different buckets, error cases |

## Next Steps
- [ ] Commit changes: `feat(backend): add address data pipeline with OpenAddresses ingestion`
- [ ] Proceed to Phase 3: Backend API Route
- [ ] Proceed to Phase 4: Storefront Component (parallel)
