# Unified Product Filter System Design

**Date:** 2026-02-27
**Status:** Approved

## Problem

The storefront has inconsistent filter implementations across product listing pages:

- **Shop page** - Dynamic filters from Meilisearch (production-ready)
- **Search page** - Hardcoded static filters (MVP approach)
- **Category/Collection/Brand pages** - No filtering, only basic sort
- **Deals page** - Simple discount filter only

## Solution

Implement a unified filter system using **Base Component + Context Wrappers** pattern.

## Architecture

```
components/filters/
├── filter-sidebar.tsx       # Base component (accordion, sections, UI)
├── filter-section.tsx       # Reusable accordion section
├── shop-filters.tsx         # Wrapper: all facets enabled
├── search-filters.tsx       # Wrapper: all facets enabled
├── category-filters.tsx     # Wrapper: hide category facet
├── collection-filters.tsx   # Wrapper: hide collection facet
├── brand-filters.tsx        # Wrapper: hide brand facet
└── hooks/
    └── use-filter-facets.ts # Shared facet fetching logic
```

## Component Design

### FilterSidebar (Base Component)

**Props:**
```typescript
interface FilterSidebarProps {
  facets: FacetData | null
  filters: FilterState
  onFilterChange: (key: string, value: any) => void
  onClearAll: () => void
  hideFacets?: ('categories' | 'brands' | 'collections' | 'onSale' | 'inStock' | 'price')[]
  showSort?: boolean
  sortOptions?: SortOption[]
  currentSort?: string
  onSortChange?: (sort: string) => void
}
```

**Features:**
- Accordion-based layout
- Dynamic facet sections (categories, brands, collections, etc.)
- Price range slider
- In-stock toggle
- On-sale toggle
- Active filter chips with remove
- Clear all button
- Mobile-responsive (collapsible)

### FilterSection (Reusable Accordion)

**Props:**
```typescript
interface FilterSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}
```

### useFilterFacets Hook

**Responsibilities:**
- Fetch facets from Meilisearch
- Handle loading/error states
- Memoize facet data
- Support context-aware filtering

## Page Mappings

| Page | Component | Hidden Facets |
|------|-----------|---------------|
| `/shop` | `ShopFilters` | None |
| `/search` | `SearchFilters` | None |
| `/categories/[...category]` | `CategoryFilters` | `categories` |
| `/collections/[handle]` | `CollectionFilters` | `collections` |
| `/brands/[handle]` | `BrandFilters` | `brands` |
| `/deals` | Keep existing `DealsFilter` | N/A |

## Implementation Tasks

### Phase 1: Core Components
1. Create `FilterSection` component
2. Create `FilterSidebar` base component
3. Create `useFilterFacets` hook

### Phase 2: Context Wrappers
4. Create `ShopFilters` wrapper
5. Create `SearchFilters` wrapper
6. Create `CategoryFilters` wrapper
7. Create `CollectionFilters` wrapper
8. Create `BrandFilters` wrapper

### Phase 3: Page Integration
9. Update Shop page to use `ShopFilters`
10. Update Search page to use `SearchFilters` (replace hardcoded)
11. Update Category pages to add `CategoryFilters`
12. Update Collection pages to add `CollectionFilters`
13. Update Brand pages to add `BrandFilters`

### Phase 4: Cleanup
14. Remove old `AdvancedShopFilters` component
15. Remove old `AdvancedSearchFilters` component
16. Update any tests

## Technical Notes

- Use existing `nuqs` for URL state management
- Reuse existing `ListingLayout` component
- Keep existing sort dropdown patterns
- Preserve mobile responsiveness with `<details>` element

## Success Criteria

- [ ] All product grid pages have consistent filtering UI
- [ ] Filters are contextual (hide irrelevant facets)
- [ ] Search page uses dynamic Meilisearch facets
- [ ] No code duplication between filter implementations
- [ ] Mobile experience preserved
- [ ] Existing functionality maintained
