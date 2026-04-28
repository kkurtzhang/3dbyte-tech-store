# Plan: Address Autocomplete — Phase 1: Shared Types & Meilisearch Module

## Summary
Extend the existing Meilisearch integration to support a new `"address"` index type. This involves adding the `MeilisearchAddressDocument` interface and `ADDRESS_INDEX_SETTINGS` to shared-types, extending the `MeilisearchIndexType` union, updating the `MeilisearchModuleService` and `MeilisearchModuleConfig` to handle the new index, creating a startup loader, and wiring everything into `medusa-config.ts`.

## User Story
As a **developer implementing the address autocomplete pipeline**,
I want **the Meilisearch module to natively support an `address` index type**,
So that **subsequent phases (data pipeline, API route, storefront component) have a stable foundation to build on**.

## Problem → Solution
The `MeilisearchIndexType` is currently `"product" | "category" | "brand"`. There is no `"address"` type, no address document interface, no index settings, and no loader. → Add all of these following the exact same patterns used for brand/category/product.

## Metadata
- **Complexity**: Small
- **Source PRD**: `.claude/PRPs/prds/address-autocomplete.prd.md`
- **PRD Phase**: Phase 1 — Shared Types & Meilisearch Module
- **Estimated Files**: 7 files (4 UPDATE, 3 CREATE)

---

## UX Design

N/A — Internal change. No user-facing UX transformation.

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `packages/shared-types/src/meilisearch.ts` | 1-62 | Union type, config interface, settings interface, and `BRAND_INDEX_SETTINGS` const — the exact patterns to mirror |
| P0 | `apps/backend/src/modules/meilisearch/service.ts` | 110-165 | Constructor validation, `getIndexName()` switch, `getIndex()` — must extend all three |
| P0 | `apps/backend/src/modules/meilisearch/loaders/configure-brand-index.ts` | 1-51 | Simplest loader pattern to copy for the address loader |
| P1 | `apps/backend/src/modules/meilisearch/index.ts` | 1-17 | Module registration — must add the new loader |
| P1 | `apps/backend/medusa-config.ts` | 101-112 | Module options — must add `addressIndexName` |
| P1 | `apps/backend/.env.template` | 11-16 | Env vars pattern — must add `MEILISEARCH_ADDRESS_INDEX_NAME` |
| P2 | `apps/storefront-v3/src/lib/search/client.ts` | 1-12 | Storefront index constants — must add `INDEX_ADDRESSES` |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| OpenAddresses CSV format | `au/countrywide.json` on GitHub | Fields: `id`, `number`, `street`, `unit`, `city`, `postcode`, `region`, `lon`, `lat`, `accuracy` |
| Meilisearch Swap Indexes | meilisearch.com docs | `POST /swap-indexes` accepts array of `[{indexes: [a, b]}]` — relevant for Phase 2, but informs the temp index naming in the loader |

---

## Patterns to Mirror

### NAMING_CONVENTION
```typescript
// SOURCE: packages/shared-types/src/meilisearch.ts:12
export type MeilisearchIndexType = "product" | "category" | "brand";

// SOURCE: packages/shared-types/src/meilisearch.ts:146-158
export interface MeilisearchBrandDocument {
  id: string;
  name: string;
  // ...
}
```
Convention: `Meilisearch{Entity}Document` for document interfaces.

### INDEX_SETTINGS_PATTERN
```typescript
// SOURCE: apps/backend/src/modules/meilisearch/service.ts:423-478
export const BRAND_INDEX_SETTINGS: MeilisearchIndexSettings = {
  searchableAttributes: ["name", "rich_description", "handle"],
  filterableAttributes: ["id", "handle", "created_at"],
  sortableAttributes: ["name", "created_at", "product_count"],
  rankingRules: ["words", "typo", "sort", "proximity", "attribute", "exactness"],
  displayedAttributes: ["id", "name", "handle", "brand_logo", "rich_description", "product_count"],
  typoTolerance: { minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
  faceting: { maxValuesPerFacet: 100 },
  pagination: { maxTotalHits: 10000 },
};
```
Convention: `{ENTITY}_INDEX_SETTINGS` const with `as const` or typed as `MeilisearchIndexSettings`, exported from `service.ts`.

### SERVICE_SWITCH_PATTERN
```typescript
// SOURCE: apps/backend/src/modules/meilisearch/service.ts:143-157
async getIndexName(type: MeilisearchIndexType): Promise<string> {
  switch (type) {
    case "product":
      return this.options_.productIndexName;
    case "category":
      return this.options_.categoryIndexName;
    case "brand":
      return this.options_.brandIndexName;
    default:
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        `Invalid index type: ${type}`,
      );
  }
}
```

### CONSTRUCTOR_VALIDATION_PATTERN
```typescript
// SOURCE: apps/backend/src/modules/meilisearch/service.ts:118-130
if (
  !options.host ||
  !options.apiKey ||
  !options.productIndexName ||
  !options.categoryIndexName ||
  !options.brandIndexName
) {
  throw new MedusaError(
    MedusaError.Types.INVALID_ARGUMENT,
    "Meilisearch options are required (host, apiKey, productIndexName, categoryIndexName, brandIndexName)",
  );
}
```

### LOADER_PATTERN
```typescript
// SOURCE: apps/backend/src/modules/meilisearch/loaders/configure-brand-index.ts:18-50
export default async function configureBrandIndexLoader({
  container,
  options,
}: LoaderOptions): Promise<void> {
  const logger: Logger = container.resolve("logger")
  try {
    if (!options) {
      throw new Error("Meilisearch module options are required")
    }
    const meilisearchService = new MeilisearchModuleService(
      { logger },
      options as MeilisearchOptions
    )
    logger.info("Configuring Meilisearch brand index...")
    await meilisearchService.configureIndex(BRAND_INDEX_SETTINGS, "brand")
    logger.info("Brand index configured successfully")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    logger.warn(`Failed to configure Meilisearch brand index: ${message}`)
    logger.warn("Brand indexing will use default Meilisearch settings")
  }
}
```

### MODULE_REGISTRATION_PATTERN
```typescript
// SOURCE: apps/backend/src/modules/meilisearch/index.ts:1-17
import { Module } from "@medusajs/framework/utils";
import MeilisearchModuleService from "./service";
import configureCategoryIndexLoader from "./loaders/configure-category-index";
import configureBrandIndexLoader from "./loaders/configure-brand-index";
import configureProductIndexLoader from "./loaders/configure-product-index";

export const MEILISEARCH_MODULE = "meilisearch";

export default Module(MEILISEARCH_MODULE, {
  service: MeilisearchModuleService,
  loaders: [
    configureCategoryIndexLoader,
    configureBrandIndexLoader,
    configureProductIndexLoader,
  ],
});
```

### CONFIG_PATTERN
```typescript
// SOURCE: apps/backend/medusa-config.ts:101-112
{
  resolve: "./src/modules/meilisearch",
  options: {
    host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
    apiKey: process.env.MEILISEARCH_API_KEY || "",
    productIndexName: process.env.MEILISEARCH_PRODUCT_INDEX_NAME || "products",
    categoryIndexName: process.env.MEILISEARCH_CATEGORY_INDEX_NAME || "categories",
    brandIndexName: process.env.MEILISEARCH_BRAND_INDEX_NAME || "brands",
  },
},
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

### LOGGING_PATTERN
```typescript
// SOURCE: apps/backend/src/modules/meilisearch/service.ts:140,177-178,261
this.logger_.info(`Meilisearch client initialized for ${options.host}`);
this.logger_.info(`Indexed ${documents.length} documents into ${type} index (task: ${task.taskUid})`);
this.logger_.info(`Configuring ${type} index settings...`);
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `packages/shared-types/src/meilisearch.ts` | UPDATE | Add `"address"` to union, `MeilisearchAddressDocument` interface, `addressIndexName` to config |
| `apps/backend/src/modules/meilisearch/service.ts` | UPDATE | Add `"address"` case to `getIndexName()`, add `addressIndexName` to constructor validation, export `ADDRESS_INDEX_SETTINGS` |
| `apps/backend/src/modules/meilisearch/loaders/configure-address-index.ts` | CREATE | New loader following brand loader pattern |
| `apps/backend/src/modules/meilisearch/index.ts` | UPDATE | Import and register the new address loader |
| `apps/backend/medusa-config.ts` | UPDATE | Add `addressIndexName` option with env var |
| `apps/backend/.env.template` | UPDATE | Add `MEILISEARCH_ADDRESS_INDEX_NAME=addresses` |
| `apps/storefront-v3/src/lib/search/client.ts` | UPDATE | Add `INDEX_ADDRESSES = "addresses"` constant |

## NOT Building

- Data pipeline / sync job (Phase 2)
- Backend autocomplete API route (Phase 3)
- Storefront autocomplete component (Phase 4)
- Tests for the autocomplete flow (Phase 5)
- Any address-related UI changes

---

## Step-by-Step Tasks

### Task 1: Add `MeilisearchAddressDocument` interface and extend union type
- **ACTION**: Update `packages/shared-types/src/meilisearch.ts`
- **IMPLEMENT**:
  1. Change line 12: `export type MeilisearchIndexType = "product" | "category" | "brand" | "address";`
  2. Add `addressIndexName: string;` to `MeilisearchModuleConfig` interface (after line 19, before `settings`)
  3. Add new interface after `MeilisearchBrandDocument` (after line 158):
  ```typescript
  /**
   * Address document for Meilisearch indexing
   * Sourced from OpenAddresses (G-NAF countrywide for AU, LINZ for NZ)
   * Fields map directly to the OpenAddresses CSV flat format
   */
  export interface MeilisearchAddressDocument {
    id: string;
    full_address: string;
    unit: string;
    number: string;
    street: string;
    suburb: string;  // OpenAddresses "CITY" field = AU suburb
    state: string;   // OpenAddresses "REGION" field = AU state abbreviation
    postcode: string;
    country: string; // "AU" or "NZ"
  }
  ```
- **MIRROR**: `NAMING_CONVENTION` — `Meilisearch{Entity}Document` pattern from `MeilisearchBrandDocument`
- **IMPORTS**: No new imports needed
- **GOTCHA**: The `.d.ts` file is auto-generated from the `.ts` file. Only edit the `.ts` source file. The `.d.ts` will be regenerated on build.
- **VALIDATE**: Run `pnpm --filter=@3dbyte-tech-store/shared-types build` — should compile with zero errors

### Task 2: Add `ADDRESS_INDEX_SETTINGS` and extend service
- **ACTION**: Update `apps/backend/src/modules/meilisearch/service.ts`
- **IMPLEMENT**:
  1. Add `"address"` case to `getIndexName()` switch (after line 150):
  ```typescript
  case "address":
    return this.options_.addressIndexName;
  ```
  2. Add `!options.addressIndexName` to constructor validation (line 124, in the `if` condition):
  ```typescript
  if (
    !options.host ||
    !options.apiKey ||
    !options.productIndexName ||
    !options.categoryIndexName ||
    !options.brandIndexName ||
    !options.addressIndexName
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      "Meilisearch options are required (host, apiKey, productIndexName, categoryIndexName, brandIndexName, addressIndexName)",
    );
  }
  ```
  3. Add `ADDRESS_INDEX_SETTINGS` const after `BRAND_INDEX_SETTINGS` (after line 478):
  ```typescript
  /**
   * Address index settings for Meilisearch
   * Optimized for type-ahead autocomplete during checkout
   */
  export const ADDRESS_INDEX_SETTINGS: MeilisearchIndexSettings = {
    // 1. SEARCHABLE
    // Primary: full composed address for broad matching
    // Secondary: individual fields for specific queries (e.g., postcode-first)
    searchableAttributes: [
      "full_address",
      "street",
      "suburb",
      "postcode",
      "number",
    ],

    // 2. FILTERABLE
    // Allow filtering by state/country to scope results
    filterableAttributes: [
      "state",
      "postcode",
      "country",
    ],

    // 3. SORTABLE
    // Addresses are not typically sorted by the user
    sortableAttributes: [],

    // 4. RANKING RULES
    // Prioritize exact matches and word proximity for address autocomplete
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ],

    // 5. DISPLAYED
    // Return all fields needed for auto-filling the checkout form
    // Exclude lat/lon to reduce payload size
    displayedAttributes: [
      "id",
      "full_address",
      "unit",
      "number",
      "street",
      "suburb",
      "state",
      "postcode",
      "country",
    ],

    // 6. TYPO TOLERANCE
    // Be generous with typos for address autocomplete
    typoTolerance: {
      minWordSizeForTypos: {
        oneTypo: 3,
        twoTypos: 6,
      },
    },

    // 7. FACETING & PAGINATION
    faceting: {
      maxValuesPerFacet: 20,
    },
    pagination: {
      maxTotalHits: 100, // Autocomplete never needs deep pagination
    },
  };
  ```
- **MIRROR**: `INDEX_SETTINGS_PATTERN`, `SERVICE_SWITCH_PATTERN`, `CONSTRUCTOR_VALIDATION_PATTERN`
- **IMPORTS**: No new imports needed (types already imported from shared-types)
- **GOTCHA**: The `MeilisearchOptions` type on line 87 is derived via `Omit<MeilisearchModuleConfig, "settings">`. Since we added `addressIndexName` to the config interface, it will automatically be included in `MeilisearchOptions` — no extra change needed.
- **VALIDATE**: Run `pnpm --filter=@3dbyte-tech-store/backend build` — should compile with zero errors

### Task 3: Create address index loader
- **ACTION**: Create `apps/backend/src/modules/meilisearch/loaders/configure-address-index.ts`
- **IMPLEMENT**:
  ```typescript
  import type { LoaderOptions } from "@medusajs/framework/types"
  import type { Logger } from "@medusajs/framework/types"
  import { ADDRESS_INDEX_SETTINGS, type MeilisearchOptions } from "../service"
  import MeilisearchModuleService from "../service"

  /**
   * Meilisearch Address Index Configuration Loader
   *
   * Initializes the address index with proper settings on application startup.
   * The address index is used for checkout address autocomplete, sourcing data
   * from OpenAddresses (G-NAF for AU, LINZ for NZ).
   *
   * Why this loader?
   * - Meilisearch auto-creates indexes with default settings when first used
   * - Custom settings (searchable attributes, typo tolerance) must be applied manually
   * - Loader runs once on startup, ensuring consistent configuration
   *
   * @param options - Loader options containing container and module options
   */
  export default async function configureAddressIndexLoader({
    container,
    options,
  }: LoaderOptions): Promise<void> {
    const logger: Logger = container.resolve("logger")

    try {
      // Module options are required for Meilisearch service initialization
      if (!options) {
        throw new Error("Meilisearch module options are required")
      }

      // Create a new instance of the Meilisearch service with module options
      // This ensures the service is properly initialized with the correct configuration
      const meilisearchService = new MeilisearchModuleService(
        { logger },
        options as MeilisearchOptions
      )

      logger.info("Configuring Meilisearch address index...")

      // Configure address index with autocomplete-optimized settings
      // This ensures proper search behavior for type-ahead checkout
      await meilisearchService.configureIndex(ADDRESS_INDEX_SETTINGS, "address")

      logger.info("Address index configured successfully")
    } catch (error) {
      // Log error but don't fail startup
      const message = error instanceof Error ? error.message : "Unknown error"
      logger.warn(`Failed to configure Meilisearch address index: ${message}`)
      logger.warn("Address indexing will use default Meilisearch settings")
    }
  }
  ```
- **MIRROR**: `LOADER_PATTERN` — exact copy of brand loader with entity name swapped
- **IMPORTS**: Same as brand loader
- **GOTCHA**: Use tabs for indentation (matching the existing brand/category loaders) — the product loader uses spaces. Follow the brand loader style since the address loader is simpler.
- **VALIDATE**: File should be syntactically correct TypeScript

### Task 4: Register address loader in module index
- **ACTION**: Update `apps/backend/src/modules/meilisearch/index.ts`
- **IMPLEMENT**:
  ```typescript
  import { Module } from "@medusajs/framework/utils";
  import MeilisearchModuleService from "./service";
  import configureCategoryIndexLoader from "./loaders/configure-category-index";
  import configureBrandIndexLoader from "./loaders/configure-brand-index";
  import configureProductIndexLoader from "./loaders/configure-product-index";
  import configureAddressIndexLoader from "./loaders/configure-address-index";

  export const MEILISEARCH_MODULE = "meilisearch";

  export default Module(MEILISEARCH_MODULE, {
    service: MeilisearchModuleService,
    loaders: [
      configureCategoryIndexLoader,
      configureBrandIndexLoader,
      configureProductIndexLoader,
      configureAddressIndexLoader,
    ],
  });
  ```
- **MIRROR**: `MODULE_REGISTRATION_PATTERN`
- **IMPORTS**: `import configureAddressIndexLoader from "./loaders/configure-address-index"`
- **GOTCHA**: None
- **VALIDATE**: File compiles

### Task 5: Add `addressIndexName` to medusa-config.ts
- **ACTION**: Update `apps/backend/medusa-config.ts`
- **IMPLEMENT**: Add `addressIndexName` to the meilisearch module options block (after line 110):
  ```typescript
  {
    resolve: "./src/modules/meilisearch",
    options: {
      host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
      apiKey: process.env.MEILISEARCH_API_KEY || "",
      productIndexName: process.env.MEILISEARCH_PRODUCT_INDEX_NAME || "products",
      categoryIndexName: process.env.MEILISEARCH_CATEGORY_INDEX_NAME || "categories",
      brandIndexName: process.env.MEILISEARCH_BRAND_INDEX_NAME || "brands",
      addressIndexName: process.env.MEILISEARCH_ADDRESS_INDEX_NAME || "addresses",
    },
  },
  ```
- **MIRROR**: `CONFIG_PATTERN`
- **IMPORTS**: None
- **GOTCHA**: None
- **VALIDATE**: Config compiles

### Task 6: Add env var to `.env.template`
- **ACTION**: Update `apps/backend/.env.template`
- **IMPLEMENT**: Add after line 15 (`MEILISEARCH_CATEGORY_INDEX_NAME=categories`):
  ```
  MEILISEARCH_BRAND_INDEX_NAME=brands
  MEILISEARCH_ADDRESS_INDEX_NAME=addresses
  ```
- **MIRROR**: Follows existing env var naming: `MEILISEARCH_{ENTITY}_INDEX_NAME`
- **IMPORTS**: N/A
- **GOTCHA**: The brand index name env var is missing from the template currently. Add both brand and address for completeness.
- **VALIDATE**: Template has all required Meilisearch env vars

### Task 7: Add `INDEX_ADDRESSES` constant to storefront search client
- **ACTION**: Update `apps/storefront-v3/src/lib/search/client.ts`
- **IMPLEMENT**: Add after line 11:
  ```typescript
  export const INDEX_ADDRESSES = "addresses";
  ```
- **MIRROR**: Follows existing pattern: `export const INDEX_{ENTITY} = "{lowercase_plural}"`
- **IMPORTS**: None
- **GOTCHA**: None
- **VALIDATE**: File compiles

---

## Testing Strategy

### Unit Tests

This phase is primarily type/config changes with minimal logic. The main testable unit is the `getIndexName()` switch statement.

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| `getIndexName("address")` returns correct name | `"address"` | `"addresses"` (from config) | No |
| Constructor throws without `addressIndexName` | Missing `addressIndexName` in options | `MedusaError` thrown | Yes |
| `ADDRESS_INDEX_SETTINGS` has required fields | Import settings const | All 7 setting categories defined | No |

### Edge Cases Checklist
- [x] Missing `addressIndexName` in config → Constructor throws `MedusaError`
- [x] Address loader fails to connect → Logs warning, does NOT crash startup
- [x] Invalid index type → Default case in switch throws `MedusaError`

---

## Validation Commands

### Static Analysis
```bash
pnpm --filter=@3dbyte-tech-store/shared-types build
```
EXPECT: Zero type errors

### Backend Build
```bash
pnpm --filter=@3dbyte-tech-store/backend build
```
EXPECT: Zero type errors, all new code compiles

### Storefront Build
```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 build
```
EXPECT: Zero type errors

### Full Monorepo Build
```bash
pnpm run build:turbo
```
EXPECT: No regressions across any workspace

### Manual Validation
- [ ] Start backend with `pnpm run dev:backend`
- [ ] Check logs for: `"Configuring Meilisearch address index..."`
- [ ] Check logs for: `"Address index configured successfully"` OR the warning fallback
- [ ] Verify in Meilisearch dashboard (http://localhost:7700) that the `addresses` index exists with correct settings

---

## Acceptance Criteria
- [ ] `MeilisearchIndexType` includes `"address"`
- [ ] `MeilisearchAddressDocument` interface exists in shared-types
- [ ] `MeilisearchModuleConfig` includes `addressIndexName`
- [ ] `getIndexName("address")` returns the configured index name
- [ ] Constructor validates `addressIndexName` is present
- [ ] `ADDRESS_INDEX_SETTINGS` is exported from service.ts
- [ ] Address index loader runs on startup
- [ ] Loader is registered in module index
- [ ] `medusa-config.ts` passes `addressIndexName` from env var
- [ ] `.env.template` documents the new env var
- [ ] Storefront has `INDEX_ADDRESSES` constant
- [ ] All builds pass with zero type errors

## Completion Checklist
- [ ] Code follows discovered patterns (verified via MIRROR references)
- [ ] Error handling matches codebase style (MedusaError, try/catch with warn)
- [ ] Logging follows codebase conventions (info for success, warn for non-fatal failure)
- [ ] No hardcoded values (all via env vars with defaults)
- [ ] No unnecessary scope additions
- [ ] Self-contained — no questions needed during implementation

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Existing Meilisearch service tests break due to missing `addressIndexName` | Medium | Low | Add `addressIndexName: "test_addresses"` to all test fixtures/mocks |
| Shared-types build order issue in monorepo | Low | Medium | Build shared-types first (`pnpm --filter=@3dbyte-tech-store/shared-types build`) |

## Notes
- The `MeilisearchAddressDocument` intentionally excludes `lat`/`lon` coordinates. These are present in the OpenAddresses CSV but are not needed for text autocomplete. Excluding them reduces Meilisearch disk usage significantly for 15M+ documents.
- `pagination.maxTotalHits` is set to 100 (vs 10000 for products) because address autocomplete never needs deep pagination — users select from the first 5-8 results.
- `typoTolerance.minWordSizeForTypos.oneTypo` is set to 3 (vs 4 for other indexes) because street names and suburbs are often short words where one typo is common (e.g., "Syd" vs "Sydney").
