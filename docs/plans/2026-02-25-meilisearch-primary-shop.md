# Meilisearch as Primary Data Source for Shop Page

**Date:** 2026-02-25
**Status:** Ready for Implementation
**Scope:** Shop page (`/shop`) only

## Summary

Replace Medusa SDK with Meilisearch as the primary data source for the shop page product grid. This will improve performance by:
- Using a single query to fetch products AND filter facets
- Enabling server-side sorting
- Supporting all product options as dynamic filters
- Reducing N+1 API calls for filter counts

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NEW Shop Page Data Flow                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. PRIMARY: Meilisearch Query                                     │
│     Shop Page (Server) ──► Meilisearch Query                       │
│                              (products + facets in single call)     │
│                                                                     │
│  2. FALLBACK: Medusa SDK (only if Meilisearch fails)               │
│     Meilisearch Error ──► Medusa SDK                               │
│                                                                     │
│  3. ERROR STATE (both fail)                                        │
│     Return empty + error flag ──► Show error UI                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Meilisearch Index Configuration (Already Set Up)

- **Filterable Attributes:** `brand.id`, `category_ids`, `type_id`, `on_sale`, `in_stock`, `price_aud`, `price_nzd`, `options_*`
- **Sortable Attributes:** `created_at_timestamp`, `price_aud`, `price_nzd`
- **Total Products:** 1,044

## Filter Selection Types

| Filter Type | Selection Mode | URL Parameter |
|-------------|----------------|---------------|
| Categories | Multi-select | `category=id1,id2` |
| Brands | Multi-select | `brand=id1,id2` |
| On Sale | Toggle | `onSale=true` |
| In Stock | Toggle | `inStock=true` |
| Price Range | Range | `minPrice=10&maxPrice=100` |
| Colour | Multi-select | `options_colour=Black,White` |
| Size | Multi-select | `options_size=S,M,L` |
| Nozzle Type | Multi-select | `options_nozzle_type=V6,Prusa` |
| Nozzle Size | Multi-select | `options_nozzle_size=0.4mm,0.6mm` |
| Other options | Multi-select | `options_<key>=val1,val2` |

**Excluded from UI:** `options_default`

### Filter Logic

- **OR** within same filter (e.g., Black OR White)
- **AND** across different filters (e.g., Black AND In Stock)

## Implementation Tasks

### Phase 1: Core Search Service

#### Task 1.1: Create Product Search Service
**File:** `src/lib/search/products.ts`

Create new service with:
- `searchProducts(params)` - Main search function with facets
- `ProductSearchParams` interface
- `ProductSearchResult` interface with products, facets, error flag
- Filter building logic (OR within, AND across)
- Sort mapping (newest, price-asc, price-desc)
- Fallback to Medusa on error

#### Task 1.2: Remove Demo Products Fallback
**File:** `src/lib/medusa/products.ts`

- Remove `getDemoProducts()` function
- Remove demo products fallback from `getProductsFromMeilisearch()`
- Return empty array + error flag on failure

### Phase 2: Filter Components

#### Task 2.1: Update Advanced Shop Filters
**File:** `src/features/shop/components/advanced-shop-filters.tsx`

Changes:
- Accept `facets` prop from server
- Replace hardcoded COLORS/SIZES with dynamic options
- Add single-select for brands (radio-style)
- Add dynamic options rendering loop
- Exclude `options_default` from UI
- Use `OPTION_LABELS` map for human-readable labels

#### Task 2.2: Create Filter Types
**File:** `src/features/shop/types/filters.ts` (new)

Define types:
- `FilterFacets` - Facet data structure
- `FilterOption` - Single filter option with count
- `FilterGroup` - Group of filter options

### Phase 3: Shop Page Integration

#### Task 3.1: Update Shop Page
**File:** `src/app/shop/page.tsx`

Changes:
- Replace `getProducts()` with `searchProducts()`
- Pass facets to filter component
- Handle error/empty states
- Update URL param parsing for new structure
- Add brand param handling

#### Task 3.2: Create Error State Component
**File:** `src/features/shop/components/shop-error-state.tsx` (new)

- Show error message when both services fail
- Include "Try Again" button
- Use router.refresh() for retry

#### Task 3.3: Create Empty State Component
**File:** `src/features/shop/components/shop-empty-state.tsx` (new)

- Show "No products match your filters" when results empty
- Show "Clear All Filters" button when filters active
- Show different message when no filters active

### Phase 4: URL & Utilities

#### Task 4.1: Update URL Utilities
**File:** `src/lib/utils/url.ts`

Add support for:
- `brand` param (single value)
- `onSale` param
- `inStock` param
- `options_*` params (dynamic)

## File Changes Summary

| File | Action |
|------|--------|
| `src/lib/search/products.ts` | **Create** - Main search service |
| `src/lib/medusa/products.ts` | **Modify** - Remove demo fallback |
| `src/features/shop/components/advanced-shop-filters.tsx` | **Modify** - Dynamic filters |
| `src/features/shop/types/filters.ts` | **Create** - Filter types |
| `src/app/shop/page.tsx` | **Modify** - Use new search service |
| `src/features/shop/components/shop-error-state.tsx` | **Create** - Error UI |
| `src/features/shop/components/shop-empty-state.tsx` | **Create** - Empty UI |
| `src/lib/utils/url.ts` | **Modify** - New URL params |

## Error Handling

| Scenario | Response | UI |
|----------|----------|-----|
| Meilisearch success | products + facets | Product grid with filters |
| Meilisearch fail, Medusa success | products, no facets | Product grid, static filters |
| Both fail | `{ products: [], error: true }` | Error message + retry |
| No results | `{ products: [], count: 0 }` | Empty state + clear filters |

## Success Criteria

- [ ] Shop page loads products from Meilisearch (primary)
- [ ] Facets return in same query (no N+1 calls)
- [ ] All filter options are dynamic (no hardcoded values)
- [ ] Multi-select works for categories, brands, and options
- [ ] Sorting works server-side
- [ ] Fallback to Medusa works when Meilisearch fails
- [ ] Error/empty states display correctly
- [ ] No demo products shown

## Out of Scope

- Other pages (categories, collections, etc.) - future iteration
- Search page (already uses Meilisearch)
- Admin/management features
