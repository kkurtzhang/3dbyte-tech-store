# Meilisearch Category Indexing - Implementation Plan

**Date:** 2026-01-18
**Status:** Design Complete
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
  parent_name?: string        // Breadcrumb: "Men > Clothing"
  rank: number               // Order among siblings
  path: string[]             // Full path array: ["Men", "Clothing", "Shoes"]

  // Computed
  product_count: number      // Active products in this category

  // Timestamp (UNIX format)
  created_at: number         // UNIX timestamp in milliseconds
}
```

## Meilisearch Index Configuration

```typescript
{
  searchableAttributes: ["name", "parent_name", "handle"],
  filterableAttributes: ["id", "parent_category_id", "product_count", "path", "created_at"],
  sortableAttributes: ["rank", "product_count", "created_at", "name"],
  rankingRules: [
    "words",
    "typo",
    "sort",
    "proximity",
    "attribute",
    "exactness",
    "product_count:desc"
  ],
  displayedAttributes: ["id", "name", "handle", "description", "parent_name", "product_count", "path"],
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

### Phase 3: Workflow Steps

**File:** `apps/backend/src/workflows/meilisearch/steps/compute-category-path.ts`

- Traverse parent_category relationships
- Build path array: ["Men", "Clothing", "Shoes"]
- Build parent_name breadcrumb: "Men > Clothing"

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

- Configure cron job: "0 2 * * *" (daily at 2 AM)
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
    └── utils.ts (extend existing)

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

- [ ] Categories indexed with correct hierarchy paths
- [ ] Product counts accurate within nightly sync window
- [ ] Admin sync button functional
- [ ] Scheduled sync running at 2 AM daily
- [ ] All unit and integration tests passing
- [ ] Meilisearch index configured correctly

## Related Documentation

- [Medusa Product Categories Reference](https://docs.medusajs.com/resources/references/product/models/ProductCategory)
- [Meilisearch Official Standards](./2026-01-17-meilisearch-official-standards.md)
