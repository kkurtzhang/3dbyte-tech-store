# PRP: Modern Meilisearch Product Search Bar

> **Feature**: Implement a modern search bar for products compatible with Meilisearch using `@meilisearch/instant-meilisearch` and `react-instantsearch`
>
> **Workspace**: `apps/storefront`
>
> **Created**: 2025-01-28
>
> **Confidence Level**: 8/10

---

## 1. FEATURE OVERVIEW

Build a modern, instant search-as-you-type experience for the storefront that integrates with Meilisearch. The search bar should provide real-time product suggestions, faceted search, and a polished UI matching the demo design in `apps/storefront/examples/demo-search-bar.png`.

### Key Requirements
- Search-as-you-type with instant results
- Two-column layout: filter sidebar (left) + product results (right)
- **Left sidebar with two sections**:
  - **SUGGESTIONS**: Dynamic query suggestions from search results
  - **COLLECTIONS**: Static collection categories for filtering
- Autocomplete with keyboard navigation
- Recent searches persistence (localStorage)
- Mobile-responsive design
- Integration with existing Meilisearch infrastructure

---

## 2. TECHNICAL CONTEXT

### 2.1 Existing Infrastructure

The following infrastructure **already exists** and should be leveraged:

**Meilisearch Client** (`apps/storefront/src/lib/meilisearch/client.ts`):
```typescript
import { instantMeiliSearch } from "@meilisearch/instant-meilisearch"

export const searchClient = instantMeiliSearch(
  process.env.NEXT_PUBLIC_MEILISEARCH_HOST,
  process.env.NEXT_PUBLIC_MEILISEARCH_API_KEY
)
export const PRODUCTS_INDEX = "products"
```

**InstantSearch Wrapper** (`apps/storefront/src/modules/search/components/instant-search/index.tsx`):
- Already wraps `react-instantsearch` with Meilisearch client
- Configured with `stalledSearchDelay={500}` for perceived performance

**Types** (`packages/shared-types/src/meilisearch.ts`):
- `MeilisearchProductDocument` - complete product document structure
- `MeilisearchSearchResponse` - search response types

**Dependencies Installed**:
- `@meilisearch/instant-meilisearch`: ^0.29.0
- `react-instantsearch`: ^7.21.0
- `meilisearch`: ^0.54.0

### 2.2 Official Documentation

**Primary Resources**:
- [React Quick Start - Meilisearch Documentation](https://meilisearch.com/docs/guides/front_end/react_quick_start) - Step-by-step React integration
- [Front-end Integration Guide](https://meilisearch.com/docs/guides/front_end/front_end_integration) - Building search interfaces
- [How to Build a Search Engine in React](https://www.meilisearch.com/blog/react-search-engine) - May 2025 tutorial

### 2.3 UI Specification (from Demo Images)

The search interface consists of **two screenshots** with comprehensive design details:

#### Left Sidebar (Filter Panel)
| Element | Specification |
|---------|---------------|
| **Background** | Light gray `#f8f8f8` |
| **Width** | 30-35% of screen width |
| **Border** | Thin light gray border `#e0e0e0` separating from right content |
| **SUGGESTIONS Header** | Uppercase, light gray `#666`, 600 weight, 14px |
| **COLLECTIONS Header** | Uppercase, light gray `#666`, 600 weight, 14px |
| **Section Spacing** | 16px margin between headers and items |
| **Item Spacing** | 12px vertical padding between items |
| **Suggestion Items** | Black `#333`, 400 weight, 16px, with gray icons (20px) |
| **Collection Items** | Black `#333`, 400 weight, 16px, no icons |
| **Interaction** | Clickable text links (no checkboxes) |
| **Hover State** | Light gray background on items |

#### Right Panel (Product Results)
| Element | Specification |
|---------|---------------|
| **Background** | White `#FFFFFF` |
| **Width** | 65-70% of screen width |
| **Product Cards** | Horizontal layout: 80x80px thumbnail + content |
| **Card Shadow** | `0 1px 3px rgba(0,0,0,0.12)` |
| **Card Hover Shadow** | `0 4px 8px rgba(0,0,0,0.18)` |
| **Border Radius** | 8px |
| **Padding** | 16px |

#### Search Input (from first screenshot)
| Element | Specification |
|---------|---------------|
| **Background** | White `#FFFFFF` |
| **Border** | Light gray `#DEE2E6` |
| **Padding** | 16px horizontal, 12px vertical |
| **Clear Button** | Appears when text present |

#### Color Palette Summary
```css
--sidebar-bg: #f8f8f8;
--content-bg: #FFFFFF;
--border-color: #e0e0e0;
--header-text: #666666;
--item-text: #333333;
--icon-color: #999999;
```

---

## 3. IMPLEMENTATION BLUEPRINT

### 3.1 Architecture Overview

```
InstantSearch (Provider)
    │
    ├── SearchBox (InstantSearch widget) - Search input with debouncing
    │
    ├── Configure (InstantSearch widget) - Configure search parameters
    │
    └── Custom Components
        │
        ├── InstantSearchResults (Main container)
        │   │
        │   ├── FilterSidebar (Left panel - light gray bg)
        │   │   │
        │   │   ├── SUGGESTIONS Section
        │   │   │   ├── QuerySuggestions - Dynamic from search results
        │   │   │   │   └── useSearchResults() - Get query suggestions
        │   │   │   └── RecentSearches - LocalStorage-based
        │   │   │
        │   │   └── COLLECTIONS Section
        │   │       └── CollectionFilter - Static collection list
        │   │           ├── Collection data from Medusa
        │   │           └── useRefineList() - Filter by collection
        │   │
        │   └── ProductHits (Right panel - white bg)
        │       ├── InfiniteHits (InstantSearch widget) - Infinite scroll results
        │       └── ProductHitCard - Custom hit component
        │
        └── NoResults - Empty state component
```

### 3.2 Key Components to Create

#### 1. `InstantSearchResults` (`apps/storefront/src/modules/search/components/instant-search/results.tsx`)

Main container component that wraps the two-column layout.

```typescript
'use client'

import { useHits, useSearchResults } from 'react-instantsearch'
import { InstantSearch as InstantSearchBase } from 'react-instantsearch'
import { searchClient } from '@lib/meilisearch/client'
import { SearchBox } from './search-box'
import { FilterSidebar } from './filter-sidebar'
import { ProductHits } from './product-hits'
import { NoResults } from './no-results'

export function InstantSearchResults({ query }: { query?: string }) {
  return (
    <InstantSearchBase
      searchClient={searchClient}
      indexName="products"
      initialUiState={{ products: { query: query || '' } }}
    >
      <SearchBox />
      <InstantSearchResultsContent />
    </InstantSearchBase>
  )
}

function InstantSearchResultsContent() {
  const { hits } = useHits()

  if (hits.length === 0) {
    return <NoResults />
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
      <FilterSidebar />
      <ProductHits />
    </div>
  )
}
```

#### 2. `ProductHitCard` (`apps/storefront/src/modules/search/components/instant-search/product-hit-card.tsx`)

Custom hit component matching the demo design.

```typescript
'use client'

import { Hit } from 'react-instantsearch'
import type { MeilisearchProductDocument } from '@3dbyte-tech-store/shared-types'
import { Box } from '@modules/common/components/box'
import { Text } from '@modules/common/components/text'
import Thumbnail from '@modules/products/components/thumbnail'
import LocalizedClientLink from '@modules/common/components/localized-client-link'

export function ProductHitCard({ hit }: { hit: MeilisearchProductDocument }) {
  return (
    <LocalizedClientLink href={`/products/${hit.handle}`}>
      <Box className="flex bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-20 h-20">
          <Thumbnail thumbnail={hit.thumbnail} size="square" />
        </div>

        {/* Content */}
        <div className="flex-grow ml-4 flex flex-col justify-between">
          <div>
            <Text className="font-semibold text-base text-gray-900">
              {hit.title}
            </Text>
            {hit.subtitle && (
              <Text size="sm" className="text-gray-500 mt-1">
                {hit.subtitle}
              </Text>
            )}
          </div>

          <Text className="font-bold text-sm text-gray-700">
            ${hit.price} {hit.currency_code}
          </Text>
        </div>
      </Box>
    </LocalizedClientLink>
  )
}
```

#### 3. `FilterSidebar` (`apps/storefront/src/modules/search/components/instant-search/filter-sidebar.tsx`)

Left sidebar with two sections: SUGGESTIONS and COLLECTIONS.

```typescript
'use client'

import { Box } from '@modules/common/components/box'
import { Text } from '@modules/common/components/text'
import { QuerySuggestions } from './query-suggestions'
import { CollectionFilter } from './collection-filter'

export function FilterSidebar() {
  return (
    <Box className="flex flex-col bg-[#f8f8f8] border-r border-[#e0e0e0]">
      {/* SUGGESTIONS Section */}
      <QuerySuggestions />

      {/* COLLECTIONS Section */}
      <CollectionFilter />
    </Box>
  )
}
```

#### 4. `QuerySuggestions` (`apps/storefront/src/modules/search/components/instant-search/query-suggestions.tsx`)

SUGGESTIONS section with dynamic query suggestions and recent searches.

```typescript
'use client'

import { useSearchResults } from 'react-instantsearch'
import { Box } from '@modules/common/components/box'
import { Text } from '@modules/common/components/text'
import { SearchIcon } from '@modules/common/icons'
import { RecentSearches } from '../search-dropdown/recent-searches'

export function QuerySuggestions() {
  const { results } = useSearchResults()

  // Generate query suggestions from hits (product titles)
  const suggestions = results?.hits?.slice(0, 5).map((hit: any) => hit.title) || []

  return (
    <Box className="flex flex-col px-4 py-4">
      {/* SUGGESTIONS Header */}
      <Text className="text-xs font-semibold text-[#666] uppercase mb-4">
        Suggestions
      </Text>

      {/* Query suggestions from Meilisearch */}
      <div className="flex flex-col gap-3">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            className="flex items-center gap-3 px-0 py-2 text-left text-[#333] hover:bg-gray-200/50 rounded transition-colors"
          >
            <SearchIcon className="w-5 h-5 text-[#999] flex-shrink-0" />
            <Text className="text-base font-normal">{suggestion}</Text>
          </button>
        ))}
      </div>

      {/* Recent searches from localStorage */}
      <Box className="mt-6">
        <Text className="text-xs font-semibold text-[#666] uppercase mb-3">
          Recent
        </Text>
        <RecentSearches handleOpenDialogChange={() => {}} />
      </Box>
    </Box>
  )
}
```

#### 5. `CollectionFilter` (`apps/storefront/src/modules/search/components/instant-search/collection-filter.tsx`)

COLLECTIONS section with static collection categories from Medusa.

```typescript
'use client'

import { useMemo } from 'react'
import { useRefinementList } from 'react-instantsearch'
import { Box } from '@modules/common/components/box'
import { Text } from '@modules/common/components/text'
import { getCollections } from '@lib/data/collections'

export function CollectionFilter() {
  // Get collections from Medusa (static data)
  const { collections } = getCollections()

  // Use InstantSearch's refinement list for filtering
  const { items, refine } = useRefinementList({
    attribute: 'collection_ids',
  })

  // Combine InstantSearch items with Medusa collection data
  const collectionItems = useMemo(() => {
    return collections.map((collection) => ({
      id: collection.id,
      label: collection.title,
      value: collection.id,
      isRefined: items.some((item) => item.value === collection.id),
    }))
  }, [collections, items])

  return (
    <Box className="flex flex-col px-4 py-4 border-t border-[#e0e0e0]">
      {/* COLLECTIONS Header */}
      <Text className="text-xs font-semibold text-[#666] uppercase mb-4">
        Collections
      </Text>

      {/* Collection list - no checkboxes, just clickable links */}
      <div className="flex flex-col gap-3">
        {collectionItems.map((collection) => (
          <button
            key={collection.id}
            onClick={() => refine(collection.value)}
            className={`
              px-0 py-2 text-left text-base font-normal transition-colors
              ${collection.isRefined
                ? 'text-[#333] font-semibold'
                : 'text-[#333] hover:bg-gray-200/50'
              }
              rounded
            `}
          >
            {collection.label}
          </button>
        ))}
      </div>
    </Box>
  )
}
```

#### 6. `ProductHits` (`apps/storefront/src/modules/search/components/instant-search/product-hits.tsx`)

Right panel with infinite scroll product results.

```typescript
'use client'

import { InfiniteHits } from 'react-instantsearch'
import { ProductHitCard } from './product-hit-card'
import { Box } from '@modules/common/components/box'
import { Text } from '@modules/common/components/text'

export function ProductHits() {
  return (
    <Box className="flex flex-col">
      <Box className="flex h-[62px] items-center justify-between">
        <Text size="md" className="text-secondary">
          Products
        </Text>
      </Box>

      <InfiniteHits
        hitComponent={({ hit }) => <ProductHitCard hit={hit} />}
        classNames={{
          list: 'flex flex-col gap-4',
          item: 'w-full',
          loadMore: 'w-full text-center mt-6',
          disabledLoadMore: 'hidden',
        }}
        showPrevious={false}
      />
    </Box>
  )
}
```

### 3.3 Integration Points

1. **Header Integration**: Replace/extend existing `SearchDropdown` component with `InstantSearchResults`
2. **Search Page**: Integrate with existing `search-results-template` at `apps/storefront/src/modules/search/templates/search-results-template/index.tsx`
3. **Environment Variables**: Ensure `NEXT_PUBLIC_MEILISEARCH_HOST` and `NEXT_PUBLIC_MEILISEARCH_API_KEY` are configured

### 3.4 Gotchas & Known Issues

1. **`use client` Directive**: All React InstantSearch components must be Client Components
2. **Server Components**: The `InstantSearchResults` wrapper can be a Server Component, but children using hooks must be Client
3. **`stalledSearchDelay`**: Already configured to 500ms for perceived performance - adjust if needed
4. **Debouncing**: InstantSearch handles debouncing automatically (default 300ms) - no manual debouncing needed
5. **SSR Considerations**: InstantSearch doesn't support SSR out of the box - use `suppressHydrationWarning` if needed
6. **Next.js 16 + React 19**: Ensure compatibility - some InstantSearch patterns may need adjustment for React 19

---

## 4. TASK LIST

Execute tasks in order:

### Phase 1: Core Components

- [ ] **1.1** Create `ProductHitCard` component (`apps/storefront/src/modules/search/components/instant-search/product-hit-card.tsx`)
  - Match demo design (80x80 thumbnail, horizontal layout)
  - Use existing `Thumbnail` component from `@modules/products/components/thumbnail`
  - Use `LocalizedClientLink` for navigation
  - White background, shadow on hover

- [ ] **1.2** Create `QuerySuggestions` component (`apps/storefront/src/modules/search/components/instant-search/query-suggestions.tsx`)
  - Use `useSearchResults()` hook from react-instantsearch
  - Display query suggestions from Meilisearch hits
  - Integrate existing `RecentSearches` component
  - Gray icons for suggestions, no icons for recent searches
  - Light gray sidebar background `#f8f8f8`

- [ ] **1.3** Create `CollectionFilter` component (`apps/storefront/src/modules/search/components/instant-search/collection-filter.tsx`)
  - Use `useRefinementList()` hook for filtering by `collection_ids`
  - Get collections from Medusa via `getCollections()`
  - Display as clickable text links (no checkboxes)
  - Top border to separate from SUGGESTIONS section

- [ ] **1.4** Create `FilterSidebar` component (`apps/storefront/src/modules/search/components/instant-search/filter-sidebar.tsx`)
  - Container with light gray background `#f8f8f8`
  - Border right `#e0e0e0`
  - Combine `QuerySuggestions` and `CollectionFilter`

- [ ] **1.5** Create `ProductHits` component (`apps/storefront/src/modules/search/components/instant-search/product-hits.tsx`)
  - Use `InfiniteHits` widget from react-instantsearch
  - Custom classNames for styling
  - Integrate `ProductHitCard`

- [ ] **1.6** Create `NoResults` component (`apps/storefront/src/modules/search/components/instant-search/no-results.tsx`)
  - Empty state design matching demo
  - Helpful message for users

- [ ] **1.7** Create `InstantSearchResults` container (`apps/storefront/src/modules/search/components/instant-search/results.tsx`)
  - Wrap with existing `InstantSearch` component
  - Two-column grid layout (30% / 70%)
  - Conditional rendering for no results

### Phase 2: Search Box Enhancement

- [ ] **2.1** Enhance existing `ControlledSearchBox` or create new `InstantSearchBox`
  - Use `SearchBox` widget from react-instantsearch
  - Add debouncing (handled by InstantSearch)
  - Clear button functionality
  - Keyboard navigation support

- [ ] **2.2** Add focus management
  - Auto-focus on mount
  - Blur on escape key

### Phase 3: Integration

- [ ] **3.1** Update `SearchDropdown` component (`apps/storefront/src/modules/search/components/search-dropdown/index.tsx`)
  - Replace recommended products section with `InstantSearchResults`
  - Keep existing recent searches integration

- [ ] **3.2** Update search results page (`apps/storefront/src/modules/search/templates/search-results-template/index.tsx`)
  - Consider using InstantSearch for full-page results
  - Maintain existing filter/sort functionality

### Phase 4: Styling & Polish

- [ ] **4.1** Apply Tailwind styles matching demo design
  - **Sidebar colors**: `#f8f8f8` background, `#e0e0e0` border, `#666` headers, `#333` items
  - **Content colors**: `#FFFFFF` background, product cards with shadow
  - Spacing: 16px padding, 12px item gaps, 16px section gaps
  - Border radius: 8px for product cards
  - Shadows: `0 1px 3px rgba(0,0,0,0.12)` for cards, `0 4px 8px` on hover

- [ ] **4.2** Add responsive design
  - Single column on mobile (< 768px)
  - Two-column on desktop (≥ 768px)

- [ ] **4.3** Add loading states
  - Skeleton loaders for hits
  - Loading indicator in search box

- [ ] **4.4** Add hover/active states
  - Hover shadows on product cards
  - Active states for suggestions

### Phase 5: Testing & Validation

- [ ] **5.1** Test search functionality
  - Type queries and verify instant results
  - Test keyboard navigation
  - Test recent searches persistence
  - Verify query suggestions appear from search results

- [ ] **5.2** Test collection filter functionality
  - Click a collection and verify results are filtered
  - Verify active collection is visually indicated (bold/semibold)
  - Click multiple collections (OR behavior)
  - Clear collection filter and verify all results return

- [ ] **5.3** Test responsive behavior
  - Mobile: single column layout
  - Desktop: two-column layout

- [ ] **5.4** Test edge cases
  - No results state
  - Empty query state
  - Network error handling

---

## 5. VALIDATION GATES

Execute these commands to validate the implementation:

```bash
# 1. Type checking
cd apps/storefront
pnpm run type-check

# 2. Linting
pnpm run lint

# 3. Build verification
pnpm run build

# 4. Start dev server
pnpm dev

# 5. Manual testing checklist
# - Navigate to storefront
# - Click search icon in header
# - Type a product query (e.g., "shirt")
# - Verify instant results appear
# - Verify two-column layout on desktop (light gray sidebar)
# - Verify single-column on mobile
# - Click a product result - verify navigation
# - Click a collection in sidebar - verify filter applies
# - Verify active collection shows bold text
# - Test keyboard arrows for navigation
# - Clear search and verify recent searches appear
```

### Expected Behaviors

| Scenario | Expected Behavior |
|----------|------------------|
| User types "shirt" | Instant results appear within 300ms |
| User clicks a product | Navigates to product detail page |
| User presses Escape | Search dropdown closes |
| User has recent searches | Shows in SUGGESTIONS section |
| User clicks "Minimalist Desk" collection | Products filtered by that collection |
| Active collection | Shows in bold text |
| No results match | Shows "No results" message |
| Mobile view | Single column layout |
| Desktop view | Two-column layout with light gray sidebar |

---

## 6. FILE REFERENCE SUMMARY

### Files to Create
```
apps/storefront/src/modules/search/components/instant-search/
├── product-hit-card.tsx       # Individual product result
├── query-suggestions.tsx      # SUGGESTIONS section (with recent searches)
├── collection-filter.tsx      # COLLECTIONS section (static collections)
├── filter-sidebar.tsx         # Left sidebar container
├── product-hits.tsx           # Right panel results
├── no-results.tsx             # Empty state
└── results.tsx                # Main container
```

### Files to Modify
```
apps/storefront/src/modules/search/components/search-dropdown/index.tsx
apps/storefront/src/modules/search/components/search-box/index.tsx
apps/storefront/src/modules/search/templates/search-results-template/index.tsx
```

### Existing Files to Reference
```
apps/storefront/src/lib/meilisearch/client.ts              # Meilisearch client
apps/storefront/src/modules/search/components/instant-search/index.tsx  # Wrapper
packages/shared-types/src/meilisearch.ts                   # Types
apps/storefront/src/modules/search/components/search-dropdown/recent-searches.tsx
apps/storefront/src/modules/search/components/search-dropdown/recommended-item.tsx
apps/storefront/src/modules/search/actions.ts              # Existing search actions
```

---

## 7. SOURCES

- [React Quick Start - Meilisearch Documentation](https://meilisearch.com/docs/guides/front_end/react_quick_start)
- [Front-end Integration Guide](https://meilisearch.com/docs/guides/front_end/front_end_integration)
- [How to Build a Search Engine in React](https://www.meilisearch.com/blog/react-search-engine)
- [How to implement instant search in your React app](https://www.meilisearch.com/blog/instant-search-react-app)
- [npm: @meilisearch/instant-meilisearch](https://www.npmjs.com/package/@meilisearch/instant-meilisearch)
- [GitHub: meilisearch-js-plugins](https://github.com/meilisearch/meilisearch-js-plugins)

---

## 8. APPENDIX: Code Patterns

### Pattern 1: Using InstantSearch Hooks

```typescript
'use client'

import { useHits, useSearchResults } from 'react-instantsearch'

function MyComponent() {
  const { hits, results } = useHits()
  const searchResults = useSearchResults()

  return (
    <div>
      <p>Found {results?.estimatedTotalHits} results</p>
      {hits.map((hit) => (
        <ProductHitCard key={hit.id} hit={hit} />
      ))}
    </div>
  )
}
```

### Pattern 2: Custom SearchBox with Debouncing

```typescript
'use client'

import { SearchBox as InstantSearchBox } from 'react-instantsearch'
import { useState } from 'react'

export function SearchBox() {
  const [query, setQuery] = useState('')

  return (
    <InstantSearchBox
      classNames={{
        form: 'relative w-full',
        input: 'w-full px-4 py-3 border border-gray-300 rounded-lg',
        submit: 'hidden',
        reset: 'absolute right-2 top-1/2 -translate-y-1/2',
      }}
      placeholder="Search products..."
      autoFocus
    />
  )
}
```

### Pattern 3: InfiniteHits with Custom Hit Component

```typescript
'use client'

import { InfiniteHits } from 'react-instantsearch'
import { ProductHitCard } from './product-hit-card'

export function ProductHits() {
  return (
    <InfiniteHits
      hitComponent={({ hit }) => <ProductHitCard hit={hit} />}
      classNames={{
        list: 'flex flex-col gap-4',
        loadMore: 'w-full text-center',
      }}
    />
  )
}
```

---

**END OF PRP**
