# Meilisearch Category Indexing - Implementation Plan

**Date:** 2026-01-18
**Status:** Implementation Complete
**Goal:** Index product categories to Meilisearch for category browse pages and autocomplete functionality

## Overview

Add a parallel category indexing system alongside the existing product indexing. Categories will be indexed with basic Medusa data plus computed product counts and hierarchy paths.

## Document Structure

```typescript
{
  // Core identity
  id: string
  name: string
  handle: string
  description?: string

  // Hierarchy
  parent_category_id?: string
  display_path?: string        // Breadcrumb: "Men > Clothing" (Excludes self)
  rank: number               // Order among siblings

  // Navigation & Visuals
  breadcrumb: Array<{       // All parent categories (excludes current)
    id: string
    name: string
    handle: string
  }> // Example: For "Running Shoes" under "Men > Shoes":
    // [{id: "pcat_men", name: "Men", handle: "men"},
    //  {id: "pcat_shoes", name: "Shoes", handle: "shoes"}]

  // Filtering & Querying
  category_ids: string[]    // For Filtering: "Give me all sub-categories of ID X"

  // Computed
  product_count: number      // Active products in this category (includes descendants)

  // Timestamp (UNIX format)
  created_at: number         // UNIX timestamp in milliseconds
}
```

## Meilisearch Index Configuration

```typescript
{
  // Users search by Name ("Shoes") or Breadcrumb ("Men").
  // 'handle' is searchable in case someone searches by a URL slug they saw.
  searchableAttributes: ["name", "display_path", "handle"],

  // Critical for the frontend to hide empty categories or build specific menus.
  filterableAttributes: [
    "id",
    "category_ids",          // CRITICAL: Used for "Show all sub-categories of X
    "parent_category_id",    // Used for "Show direct children of X"
    "product_count",         // Filter: "product_count > 0"
    "created_at",            // Filter: "created_at > 170000..." (New categories)
  ],

  // Categories are rarely sorted by date.
  // They are sorted by "Rank" (Manual order) or "Popularity" (Traffic).
  sortableAttributes: [
       "rank",             // Your manual order from Medusa Admin
    "product_count",    // For "Most Popular" sorting
    "name",             // For "A-Z" sorting
    "created_at",        // For "Newest" sorting
],

  // This is the "Secret Sauce".
  // We modify the standard rules to prioritize 'rank' field above text relevance.
  rankingRules: [
    "words",
    "typo",
    "sort",                  // <--- Moved UP (Default is #5). Important!
    "proximity",
    "attribute",
    "exactness",
    "product_count:desc",    // Boost categories with more products
  ],

  // Keep the payload light. Don't send internal flags.
  displayedAttributes: [
    "id",
    "name",
    "handle",
    "description",
    "display_path",
    "breadcrumb",            // For rich display: Link > Link > Link
    "product_count",
    "rank",
  ],

  // Optional: Prevent "shos" from matching "shoes" if you want strictness.
  typoTolerance: {
    minWordSizeForTypos: {
      oneTypo: 4,
      twoTypos: 8
    }
  },

  faceting: { maxValuesPerFacet: 100 },
  pagination: { maxTotalHits: 10000 }
}
```

## Implementation Steps

### Phase 1: Shared Types

**File:** `packages/shared-types/src/meilisearch.ts`

1. Update `MeilisearchIndexType` to include "category"
2. Add `MeilisearchCategoryDocument` interface
3. Update `MeilisearchSearchResponse` to support both types

### Phase 2: Backend Module Extension

**File:** `apps/backend/src/modules/meilisearch/service.ts`

1. Add `categoryIndexName` to module options
2. Extend `getIndexName()` to handle "category" type
3. Add `configureCategoryIndex()` method with settings
4. Export category index configuration constant

**File:** `apps/backend/src/modules/meilisearch/utils.ts`

1. Add `toCategoryDocument()` transform function
2. Add `computeCategoryPath()` helper

### Phase 2.5: Category Index Initialization Loader

**File:** `apps/backend/src/modules/meilisearch/loaders/configure-category-index.ts`

- Create module loader to auto-configure category index on startup
- Apply `CATEGORY_INDEX_SETTINGS` to ensure proper search behavior
- Registered in module's `index.ts` via `loaders` array

**File:** `apps/backend/src/modules/meilisearch/index.ts`

- Register `configureCategoryIndexLoader` in module definition

**Why this loader?**

- Meilisearch auto-creates indexes with default settings when first used
- Custom settings (ranking rules, filterable attributes) must be applied manually
- Loader runs once on startup, ensuring consistent configuration before any indexing

### Phase 3: Workflow Steps

**File:** `apps/backend/src/workflows/meilisearch/steps/compute-category-path.ts`

- Traverse parent_category relationships
- Build path array: ["Men", "Clothing", "Shoes"]
- Build display_path breadcrumb: "Men > Clothing"

**File:** `apps/backend/src/workflows/meilisearch/steps/compute-product-counts.ts`

- Count published products per category
- Handle both direct product assignment and child category aggregation

**File:** `apps/backend/src/workflows/meilisearch/steps/sync-categories.ts`

- Transform categories to Meilisearch documents
- Index with compensation function for rollback

**File:** `apps/backend/src/workflows/meilisearch/steps/delete-categories-from-meilisearch.ts`

- Delete inactive/deleted categories from index
- Include compensation for rollback

### Phase 4: Main Workflow

**File:** `apps/backend/src/workflows/meilisearch/sync-categories.ts`

- Fetch categories with filters: `is_active: true`, `is_internal: false`, `deleted_at: null`
- Fetch nested parent hierarchy (up to 4 levels) to enable full breadcrumb computation
- Separate active vs inactive
- Compute path and product counts
- Sync active, delete inactive
- Return statistics

### Phase 5: API Endpoint

**File:** `apps/backend/src/api/admin/meilisearch/sync-categories/route.ts`

- `POST /admin/meilisearch/sync-categories`
- Manual trigger for full category sync
- Paginated sync (50 categories per batch)

### Phase 6: Event Subscribers

**File:** `apps/backend/src/subscribers/category-created.ts`

- Event: `product-category.created`
- Sync new category to Meilisearch

**File:** `apps/backend/src/subscribers/category-updated.ts`

- Event: `product-category.updated`
- Re-index updated category

**File:** `apps/backend/src/subscribers/category-deleted.ts`

- Event: `product-category.deleted`
- Remove category from Meilisearch

### Phase 7: Admin UI

**File:** `apps/backend/src/admin/routes/settings/meilisearch/page.tsx`

- Extend existing Meilisearch settings page
- Add "Categories Index" section with sync button
- Display indexed category count

### Phase 8: Scheduled Sync

**File:** `apps/backend/src/jobs/sync-categories-scheduled.ts`

- Configure cron job: "0 2 \* \* \*" (daily at 2 AM)
- Run full category sync
- Handle errors gracefully (retry next night)

### Phase 9: Configuration

**File:** `apps/backend/medusa-config.ts`

- Add `categoryIndexName` to Meilisearch module options

**File:** `.env`

```env
MEILISEARCH_CATEGORY_INDEX_NAME=categories
CATEGORY_SYNC_CRON="0 2 * * *"
```

### Phase 10: Tests

**Unit Tests:**

- `apps/backend/src/workflows/meilisearch/__tests__/compute-category-path.test.ts`
- `apps/backend/src/workflows/meilisearch/__tests__/compute-product-counts.test.ts`

**Integration Tests:**

- `apps/backend/src/integration/__tests__/meilisearch/sync-categories.test.ts`

**Test Data:**

- `apps/backend/src/scripts/seed-categories.ts`

## Files to Create

```
apps/backend/src/
├── workflows/meilisearch/
│   ├── sync-categories.ts
│   ├── __tests__/
│   │   └── compute-category-path.test.ts
│   └── steps/
│       ├── sync-categories.ts
│       ├── delete-categories-from-meilisearch.ts
│       ├── compute-category-path.ts
│       └── compute-product-counts.ts
├── subscribers/
│   ├── category-created.ts
│   ├── category-updated.ts
│   └── category-deleted.ts
├── api/admin/meilisearch/
│   └── sync-categories/route.ts
├── admin/routes/settings/meilisearch/page.tsx (extend existing)
├── integration/__tests__/meilisearch/
│   └── sync-categories.test.ts
├── jobs/sync-categories-scheduled.ts
└── modules/meilisearch/
    ├── service.ts (extend existing)
    ├── utils.ts (extend existing)
    ├── index.ts (extend existing - register loader)
    └── loaders/
        └── configure-category-index.ts

packages/shared-types/src/
└── meilisearch.ts (extend existing)
```

## Error Handling

- **Orphaned Categories:** Prevent deletion if `product_count > 0`
- **Circular Hierarchy:** Detect during path computation
- **Race Conditions:** Use async task processing, last write wins
- **Meilisearch Unavailable:** Log error, retry at next scheduled run

## Key Decisions

1. **Hierarchy Path:** Computed from parent_category relationships (mpath not available via API)
2. **Parent Name Format:** Breadcrumb string: "Men > Clothing > Shoes"
3. **Product Count Sync:** Scheduled nightly at 2 AM (not real-time)
4. **Async Processing:** Don't waitForTask in production (test-only)
5. **Query Filters:** `is_active: true`, `is_internal: false` applied at fetch time (not indexed)

## Success Criteria

- [x] Categories indexed with correct hierarchy paths
- [x] Product counts accurate within nightly sync window
- [x] Admin sync button functional
- [x] Scheduled sync running at 2 AM daily
- [x] All unit and integration tests passing
- [x] Meilisearch index configured correctly (via startup loader)

## Related Documentation

- [Medusa Product Categories Reference](https://docs.medusajs.com/resources/references/product/models/ProductCategory)
- [Meilisearch Official Standards](./2026-01-17-meilisearch-official-standards.md)

## Implementation Notes

### Loader Implementation Details

The category index initialization loader was implemented within the Meilisearch module following Medusa v2 patterns:

**File Structure:**

```
apps/backend/src/modules/meilisearch/
├── loaders/
│   └── configure-category-index.ts  ← Created
├── service.ts                       ← Exported MeilisearchOptions type
└── index.ts                         ← Registered loader in Module()
```

**Key Implementation Details:**

1. **Loader location:** Within `modules/meilisearch/loaders/` (not app-level loaders)
2. **Service instantiation:** Uses `new MeilisearchModuleService({ logger }, options)` pattern
3. **Type safety:** Exported `MeilisearchOptions` type from service.ts for loader use
4. **Error handling:** Logs warnings but doesn't fail startup if configuration fails
5. **Registration:** Added to `loaders` array in module's `index.ts`

**Loader Execution Flow:**

```
Application Startup
       ↓
Meilisearch Module Loads
       ↓
configureCategoryIndexLoader Runs
       ↓
Validates options exists
       ↓
Instantiates MeilisearchModuleService
       ↓
Calls configureIndex(CATEGORY_INDEX_SETTINGS, "category")
       ↓
Applies custom ranking rules, filters, search settings
       ↓
Index ready for category sync operations
```

**Settings Applied:**

- `rankingRules`: Boosts categories with higher product counts, prioritizes `sort` (rank) above text relevance
- `filterableAttributes`: Enables filtering by category_ids, parent_category_id, product_count, created_at
- `searchableAttributes`: Optimizes search for name, display_path, handle
- `sortableAttributes`: Allows sorting by rank, product_count, name, created_at
- `displayedAttributes`: Includes breadcrumb for rich category navigation display

### Parent Hierarchy Fetching

**Important:** The workflow query fetches nested `parent_category` relationships up to 4 levels deep to enable full breadcrumb path computation. This ensures `display_path` contains the complete path from root to parent (e.g., "Apparel > Men > Clothing") rather than just the immediate parent name.

**Query fields include:**

- `parent_category.id`, `parent_category.name`, `parent_category.handle`
- `parent_category.parent_category.*` (grandparent)
- `parent_category.parent_category.parent_category.*` (great-grandparent)
- `parent_category.parent_category.parent_category.parent_category.*` (4th level)

This depth covers most e-commerce category hierarchies while maintaining query performance.
