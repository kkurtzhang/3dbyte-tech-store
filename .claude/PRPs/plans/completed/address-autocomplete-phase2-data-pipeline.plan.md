# Plan: Address Autocomplete — Phase 2: Data Pipeline (Backend Job)

## Summary
Create a Medusa scheduled job that automatically discovers the latest AU countrywide GeoJSON.gz file from OpenAddresses, streams it through Node.js zlib + line-by-line parsing, batches transformed documents into a temporary Meilisearch index, then performs a zero-downtime index swap. Runs monthly.

## User Story
As a **store operator**, I want **address data to stay current automatically**, so that **customers always see up-to-date addresses during checkout**.

## Problem → Solution
No address data exists in Meilisearch → Automated monthly pipeline ingests ~15.8M AU addresses from OpenAddresses G-NAF GeoJSON.

## Metadata
- **Complexity**: Large
- **Source PRD**: `.claude/PRPs/prds/address-autocomplete.prd.md`
- **PRD Phase**: Phase 2 — Data Pipeline (Backend Job)
- **Estimated Files**: 4 CREATE, 0 UPDATE
- **Depends on**: Phase 1 (complete)

---

## UX Design
N/A — Internal backend change. No user-facing UX.

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `apps/backend/src/jobs/sync-meilisearch-settings.ts` | all | Job pattern: export default fn + config |
| P0 | `apps/backend/src/modules/meilisearch/service.ts` | 110-182 | `indexData()`, `configureIndex()` methods |
| P1 | `packages/shared-types/src/meilisearch.ts` | 12, 14-22 | `MeilisearchIndexType`, `MeilisearchModuleConfig` |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| OpenAddresses Data API | `batch.openaddresses.io/api/data?source=au/countrywide&layer=addresses` | Returns `[{id, job, size, output}]` — use `job` ID to construct download URL |
| OpenAddresses Job API | `batch.openaddresses.io/api/job/{jobId}` | Returns `{s3: "s3://v2.openaddresses.io/batch-prod/job/{id}/source.geojson.gz", count: 15860127}` |
| GeoJSON.gz download | `https://v2.openaddresses.io.s3.amazonaws.com/batch-prod/job/{jobId}/source.geojson.gz` | Public S3 HTTPS URL — no auth needed for GeoJSON. CSV requires donation. |
| Meilisearch swap indexes | meilisearch.com/docs/reference/api/indexes#swap-indexes | `POST /swap-indexes` with `[{indexes: ["a", "b"]}]` |

### OpenAddresses GeoJSON Feature Format
Each line in the `.geojson.gz` file is a GeoJSON Feature:
```json
{
  "type": "Feature",
  "properties": {
    "hash": "abc123",
    "number": "12",
    "street": "Main Street",
    "unit": "",
    "city": "Sydney",
    "district": "",
    "region": "NSW",
    "postcode": "2000",
    "id": ""
  },
  "geometry": {
    "type": "Point",
    "coordinates": [151.2093, -33.8688]
  }
}
```

---

## Data Format Change (vs original plan)

**Original plan**: CSV in ZIP → `csv-parser` + `adm-zip`
**Updated plan**: GeoJSON Lines in .gz → `zlib.createGunzip()` + `readline`

**Why**: OpenAddresses CSV downloads require a donation/subscription. The GeoJSON.gz file (`source.geojson.gz`) is freely accessible via the public S3 bucket.

**Impact**: 
- **Removed** dependencies: `csv-parser`, `adm-zip`, `@types/adm-zip`
- **Added** dependencies: none (Node.js built-in `zlib` and `readline`)
- **Changed** transform function: reads `properties` from GeoJSON Feature instead of CSV columns
- **Simpler** pipeline: no zip extraction step

---

## Patterns to Mirror

### JOB_PATTERN
```typescript
// SOURCE: apps/backend/src/jobs/sync-meilisearch-settings.ts:23-41,49-52
export default async function syncMeilisearchSettingsJob(container: MedusaContainer) {
  const logger: Logger = container.resolve("logger");
  try {
    logger.info("Starting scheduled Meilisearch settings sync...");
    await syncIndexSettingsFn(container, "product");
    logger.info("Meilisearch settings sync completed successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Meilisearch settings sync failed: ${message}`);
    throw error;
  }
}
export const config = {
  name: "sync-meilisearch-settings",
  schedule: "0 3 * * *",
};
```

### ERROR_HANDLING
```typescript
// SOURCE: apps/backend/src/modules/meilisearch/service.ts:302-311
async healthCheck(): Promise<boolean> {
  try {
    await this.client.health();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    this.logger_.warn(`Meilisearch health check failed: ${message}`);
    return false;
  }
}
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `apps/backend/src/lib/address-pipeline/types.ts` | CREATE | Pipeline-internal types (GeoJSON Feature, pipeline config, result) |
| `apps/backend/src/lib/address-pipeline/discover.ts` | CREATE | Fetch latest download URL from OpenAddresses batch API |
| `apps/backend/src/lib/address-pipeline/ingest.ts` | CREATE | Download GeoJSON.gz, stream, transform, batch push, swap indexes |
| `apps/backend/src/jobs/sync-addresses.ts` | CREATE | Monthly scheduled job entry point |

## NOT Building
- NZ (LINZ) data ingestion (deferred to v1.1)
- CSV format support (requires donation — using free GeoJSON)
- AWS Fargate extraction (improvement recommendation)
- Differential sync / hash comparison (improvement recommendation)
- Admin UI for pipeline monitoring

---

## Step-by-Step Tasks

### Task 1: Create pipeline types
- **ACTION**: Create `apps/backend/src/lib/address-pipeline/types.ts`
- **IMPLEMENT**:
  ```typescript
  /**
   * GeoJSON Feature from OpenAddresses source.geojson.gz
   * Each line in the file is one Feature object
   */
  export interface OpenAddressFeature {
    type: "Feature";
    properties: {
      hash: string;
      number: string;
      street: string;
      unit: string;
      city: string;      // = suburb in AU
      district: string;
      region: string;    // = state abbreviation (NSW, VIC, etc.)
      postcode: string;
      id: string;
    };
    geometry: {
      type: "Point";
      coordinates: [number, number]; // [lon, lat]
    };
  }

  /** Pipeline configuration */
  export interface AddressPipelineConfig {
    /** Number of documents per Meilisearch batch (default: 5000) */
    batchSize: number;
    /** Prefix for temporary index names (default: "addresses_tmp_") */
    tempIndexPrefix: string;
    /** Meilisearch host URL */
    meilisearchHost: string;
    /** Meilisearch API key */
    meilisearchApiKey: string;
    /** Production address index name */
    addressIndexName: string;
  }

  /** Pipeline result */
  export interface AddressPipelineResult {
    totalRows: number;
    batchesProcessed: number;
    durationMs: number;
    indexName: string;
  }
  ```
- **VALIDATE**: File compiles

### Task 2: Create discover module
- **ACTION**: Create `apps/backend/src/lib/address-pipeline/discover.ts`
- **IMPLEMENT**:
  - Export `async function discoverLatestDownloadUrl(): Promise<{ downloadUrl: string; jobId: number; expectedCount: number }>`
  - **Step 1**: `GET https://batch.openaddresses.io/api/data?source=au/countrywide&layer=addresses`
  - **Step 2**: Parse JSON array, take first element, extract `job` ID
  - **Step 3**: `GET https://batch.openaddresses.io/api/job/{jobId}`
  - **Step 4**: Extract `s3` field, convert S3 URL to HTTPS:
    ```
    s3://v2.openaddresses.io/batch-prod/job/819507/source.geojson.gz
    → https://v2.openaddresses.io.s3.amazonaws.com/batch-prod/job/819507/source.geojson.gz
    ```
  - **Step 5**: Return `{ downloadUrl, jobId, expectedCount: job.count }`
  - Throw descriptive error if no data found or API unreachable
  - Support env var override: `OPENADDRESSES_DOWNLOAD_URL` — if set, skip discovery and use directly
- **GOTCHA**: The `s3://` to `https://` conversion pattern is: `s3://{bucket}/{key}` → `https://{bucket}.s3.amazonaws.com/{key}`
- **VALIDATE**: Can be tested by running discover in isolation

### Task 3: Create ingest module
- **ACTION**: Create `apps/backend/src/lib/address-pipeline/ingest.ts`
- **IMPLEMENT**:
  - Export `async function ingestAddresses(downloadUrl: string, config: AddressPipelineConfig, logger: Logger): Promise<AddressPipelineResult>`
  - Export `function transformFeature(feature: OpenAddressFeature, rowIndex: number): MeilisearchAddressDocument` (exported for testing)
  - **Step A — Create temp index**: `const tempIndexName = config.tempIndexPrefix + Date.now()`
  - **Step B — Configure temp index**: Create raw MeiliSearch client, get temp index, update settings with `ADDRESS_INDEX_SETTINGS`
  - **Step C — Stream & Transform**: 
    1. `fetch(downloadUrl)` → get readable stream
    2. Pipe through `zlib.createGunzip()` 
    3. Pipe through `readline.createInterface()` (line-by-line)
    4. For each line: `JSON.parse(line)` → `transformFeature()` → push to batch buffer
    5. When batch buffer reaches `config.batchSize` (5000): flush to Meilisearch temp index
  - **Step D — transformFeature logic**:
    ```typescript
    function transformFeature(feature: OpenAddressFeature, rowIndex: number): MeilisearchAddressDocument {
      const props = feature.properties;
      const number = props.number?.trim() || "";
      const street = props.street?.trim() || "";
      const unit = props.unit?.trim() || "";
      const suburb = props.city?.trim() || "";
      const state = props.region?.trim() || "";
      const postcode = props.postcode?.trim() || "";
      const streetWithNumber = `${number} ${street}`.trim();
      const fullParts = [unit, streetWithNumber, suburb, state, postcode].filter(Boolean);
      return {
        id: props.hash || `au_${rowIndex}`,
        full_address: fullParts.join(", "),
        unit,
        number,
        street,
        suburb,
        state,
        postcode,
        country: "AU",
      };
    }
    ```
  - **Step E — Flush batch**: 
    ```typescript
    async function flushBatch(index: Index, batch: MeilisearchAddressDocument[], logger: Logger): Promise<void> {
      const task = await index.addDocuments(batch, { primaryKey: "id" });
      logger.info(`Flushed batch of ${batch.length} documents (task: ${task.taskUid})`);
    }
    ```
  - **Step F — Swap indexes**: After all batches flushed:
    ```typescript
    await client.swapIndexes([{ indexes: [config.addressIndexName, tempIndexName] }]);
    ```
  - **Step G — Cleanup**: Delete the old index (now at `tempIndexName`):
    ```typescript
    await client.deleteIndex(tempIndexName);
    ```
  - **Step H — Health check**: Query production index stats, warn if count < 14M
  - **Step I — Return result**: `{ totalRows, batchesProcessed, durationMs, indexName }`
- **GOTCHA**: Use `pipeline()` from `node:stream/promises` for proper backpressure. If a line fails to parse, log warning and skip (don't crash the whole pipeline).
- **GOTCHA**: The MeiliSearch SDK `swapIndexes` method exists on the client, not the index. Create the client directly: `new MeiliSearch({ host, apiKey })`.
- **GOTCHA**: GeoJSON Lines format means each line is a complete JSON object — no need for a streaming JSON parser. Simple `readline` + `JSON.parse` per line.
- **VALIDATE**: Backend compiles

### Task 4: Create the scheduled job
- **ACTION**: Create `apps/backend/src/jobs/sync-addresses.ts`
- **IMPLEMENT**:
  ```typescript
  import type { MedusaContainer } from "@medusajs/framework/types";
  import type { Logger } from "@medusajs/framework/types";
  import { discoverLatestDownloadUrl } from "../lib/address-pipeline/discover";
  import { ingestAddresses } from "../lib/address-pipeline/ingest";
  import type { AddressPipelineConfig } from "../lib/address-pipeline/types";

  export default async function syncAddressesJob(container: MedusaContainer) {
    const logger: Logger = container.resolve("logger");
    try {
      logger.info("Starting scheduled address data sync...");

      const { downloadUrl, jobId, expectedCount } = await discoverLatestDownloadUrl();
      logger.info(`Discovered OpenAddresses job ${jobId} (${expectedCount.toLocaleString()} rows): ${downloadUrl}`);

      const config: AddressPipelineConfig = {
        batchSize: 5000,
        tempIndexPrefix: "addresses_tmp_",
        meilisearchHost: process.env.MEILISEARCH_HOST || "http://localhost:7700",
        meilisearchApiKey: process.env.MEILISEARCH_API_KEY || "",
        addressIndexName: process.env.MEILISEARCH_ADDRESS_INDEX_NAME || "addresses",
      };

      const result = await ingestAddresses(downloadUrl, config, logger);
      logger.info(
        `Address sync completed: ${result.totalRows.toLocaleString()} rows, ` +
        `${result.batchesProcessed} batches, ${(result.durationMs / 1000).toFixed(1)}s`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Address sync failed: ${message}`);
      throw error;
    }
  }

  export const config = {
    name: "sync-addresses-to-meilisearch",
    schedule: "0 4 1 * *", // 1st of each month at 4 AM
  };
  ```
- **MIRROR**: `JOB_PATTERN`
- **GOTCHA**: Monthly cron `0 4 1 * *` runs at 4 AM on the 1st. Avoids conflict with 2 AM category sync and 3 AM settings sync.
- **VALIDATE**: Backend compiles, job is registered

---

## Testing Strategy

### Unit Tests
| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| `transformFeature` produces correct document | Valid GeoJSON Feature | `MeilisearchAddressDocument` with composed `full_address` | No |
| `transformFeature` handles empty unit | Feature with empty unit | `full_address` without leading comma | Yes |
| `transformFeature` handles missing hash | Feature without hash | Uses `au_${rowIndex}` as ID | Yes |
| `transformFeature` handles empty number | Feature with empty number | `full_address` starts with street name | Yes |
| `discoverLatestDownloadUrl` converts S3 to HTTPS | S3 URL from job API | Correct HTTPS URL | No |
| `discoverLatestDownloadUrl` uses env override | `OPENADDRESSES_DOWNLOAD_URL` set | Returns env value | No |
| `discoverLatestDownloadUrl` throws on empty response | Empty API response | Error thrown | Yes |

### Edge Cases Checklist
- [ ] Empty GeoJSON.gz file (0 features)
- [ ] Malformed JSON lines (skip with warning)
- [ ] Network failure during download
- [ ] Meilisearch unavailable during batch push
- [ ] Temp index cleanup on error (ensure finally block)
- [ ] Very long street names / unusual characters

---

## Validation Commands

```bash
# Build
pnpm --filter=@3dbyte-tech-store/backend build
```
EXPECT: Zero errors

```bash
# Unit tests
pnpm --filter=@3dbyte-tech-store/backend test:unit
```
EXPECT: All tests pass

### Manual Validation
- [ ] Start backend, trigger job manually via direct invocation
- [ ] Check logs for discovery, download, batch, swap, cleanup steps
- [ ] Verify `addresses` index exists in Meilisearch dashboard
- [ ] Query `addresses` index: `GET /indexes/addresses/search?q=12+Main` returns results

---

## Acceptance Criteria
- [ ] Job registered and runs on monthly cron
- [ ] Pipeline discovers latest OpenAddresses GeoJSON.gz URL dynamically
- [ ] GeoJSON.gz is streamed (never fully loaded into memory)
- [ ] Documents batched in groups of 5000
- [ ] Zero-downtime index swap works
- [ ] Old temp index deleted after swap
- [ ] Row count health check logs warning if < 14M
- [ ] Malformed JSON lines are skipped with warning (not crash)
- [ ] Env var override `OPENADDRESSES_DOWNLOAD_URL` works
- [ ] All builds pass

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OpenAddresses API response format changes | Low | High | Log full response on first discovery; add defensive parsing |
| 15.8M rows blocks event loop | Medium | Medium | Use streaming + readline; consider Worker thread if blocking observed |
| S3 public URL becomes private | Low | High | Support env var override for download URL |
| Meilisearch OOM with 15M+ docs | Low | High | Monitor memory; address index is ~3-5GB |
| GeoJSON.gz file corrupted mid-stream | Low | Medium | Wrap in try/catch, skip malformed lines |

## Notes
- **No new npm dependencies needed** — uses Node.js built-in `zlib`, `readline`, `stream/promises`, and the existing `meilisearch` SDK.
- The pipeline creates its own `MeiliSearch` client (not through `MeilisearchModuleService`) because the service doesn't support temp indexes or swap operations.
- The `hash` field from OpenAddresses is used as the document ID — it's a stable hash of the address fields, ensuring deduplication across runs.
- GeoJSON Lines format = one `JSON.parse()` per line = no streaming JSON parser needed.
