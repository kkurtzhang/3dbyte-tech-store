# PRP: Meilisearch Product Search Integration

**Created**: 2025-01-25
**Type**: Multi-App
**Workspaces Affected**: apps/backend, apps/storefront, packages/shared-types
**Confidence Score**: 9/10

---

## Executive Summary

This PRP implements Meilisearch-powered product search for the 3D Byte Tech Store. The integration uses **Medusa as an aggregator pattern**, where Medusa subscribers fetch product data from Medusa and enriched descriptions from Strapi, then index the merged data into Meilisearch. The storefront uses React InstantSearch for a fast, typeahead search experience.

**Key Architecture Decision**: Product enrichment (Medusa + Strapi data) happens at indexing time in Medusa subscribers, NOT at render time. This ensures:
- Fast search queries (single index lookup)
- Rich search results (includes Strapi content like rich_description, features)
- Separation of concerns (search vs rendering)

---

## Global Context (from /CLAUDE.md)

### Monorepo Structure
- **Package Manager**: pnpm with workspaces
- **Build System**: Turborepo
- **Apps**: backend (Medusa v2.12.3), cms (Strapi v5.15.1), storefront (Next.js 16.1.0)
- **Shared Packages**: shared-config, shared-types, shared-ui, shared-utils

### Key Rules
- File size limit: 400 lines max, 200-300 ideal
- Test coverage: 80%+ for utilities and services
- TypeScript strict mode: No `any` types
- Import order: External → Workspace → Internal → Types
- Commit convention: Conventional commits (feat, fix, docs, etc.)

### Cross-Workspace Development
1. Build shared packages first
2. Update dependent apps second
3. Use `--filter` for workspace-specific commands
4. Always validate after shared package changes

---

## App-Specific Context

### Backend Context (from apps/backend/CLAUDE.md)

**Framework**: Medusa v2.12.3

**Key Concepts**:
- **Modules**: Reusable packages with single-feature functionality (existing: `brand`, `strapi`)
- **Loaders**: Inject external services into the Medusa container
- **Subscribers**: Event handlers for product lifecycle events
- **Workflows**: Multi-step operations with automatic rollback

**Existing Patterns to Follow**:

```typescript
// Module pattern (from apps/backend/src/modules/strapi/service.ts)
class StrapiModuleService {
  protected logger_: Logger;
  private config_: StrapiConfig;

  constructor({ logger }: InjectedDependencies, options: StrapiConfig) {
    this.logger_ = logger;
    this.config_ = options;
  }

  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // HTTP request implementation
  }
}

// Subscriber pattern (from apps/backend/src/subscribers/product-updated.ts)
export default async function productUpdatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await updateProductToStrapiWorkflow(container).run({
    input: data,
  });
}

export const config: SubscriberConfig = {
  event: "product.updated",
};
```

**Testing**: Jest with supertest for API routes

### Storefront Context (from apps/storefront/CLAUDE.md)

**Framework**: Next.js 16.1.0 with App Router, React 19

**Key Concepts**:
- Server Components by default (no 'use client')
- Client Components only for interactivity
- Server Actions for mutations
- Static generation with revalidation
- Edge runtime support

**Existing Search Pattern** (from `apps/storefront/src/modules/search/actions.ts`):
```typescript
export async function search({
  currency_code,
  page,
  order = 'relevance',
  query,
  ...filters
}: SearchParams): Promise<SearchedProducts> {
  const response = await fetch(
    `${BACKEND_URL}/store/search?${searchParams.toString()}`,
    {
      headers: { 'x-publishable-api-key': PUBLISHABLE_API_KEY! },
      cache: 'no-store',
    }
  );
  return { results: data.products, count: data.count };
}
```

**Testing**: Jest + React Testing Library + Playwright

---

## Feature Requirements (from INITIAL.md)

### Core Requirements
- Integrate Meilisearch into Medusa backend
- Index enriched products (with Strapi productDescription) into Meilisearch
- Implement compatible search bar in storefront based on Meilisearch

### Functional Requirements
- [ ] **Backend**: Create Meilisearch module for indexing operations
- [ ] **Backend**: Create subscribers for product.created/updated/deleted events
- [ ] **Backend**: Enrich product data with Strapi content before indexing
- [ ] **Backend**: Configure Meilisearch index settings (searchable attributes, filters, etc.)
- [ ] **Storefront**: Replace existing search with Meilisearch-powered search
- [ ] **Storefront**: Use `@meilisearch/instant-meilisearch` and `react-instantsearch`
- [ ] **Shared Types**: Define Meilisearch-related types

### Non-Functional Requirements
- **Performance**: Search queries < 100ms, indexing < 1s per product
- **Security**: Use search-only API key in storefront, master key in backend
- **Reliability**: Non-blocking Strapi fetch (index with partial data if CMS is down)

---

## Referenced Examples

### From Codebase

**Existing Module Pattern**:
- `apps/backend/src/modules/strapi/service.ts` - Module service with config injection
- `apps/backend/src/modules/strapi/index.ts` - Module export pattern
- `apps/backend/src/modules/brand/service.ts` - Simple module using MedusaService

**Existing Subscriber Pattern**:
- `apps/backend/src/subscribers/product-created.ts` - Product creation event
- `apps/backend/src/subscribers/product-updated.ts` - Product update event
- `apps/backend/src/subscribers/product-deleted.ts` - Product deletion event

**Existing Search Components**:
- `apps/storefront/src/modules/search/components/search-dialog/index.tsx` - Search dialog
- `apps/storefront/src/modules/search/components/search-box/index.tsx` - Search input
- `apps/storefront/src/modules/search/templates/search-results-template/index.tsx` - Results page

### From examples/ Folder
- `apps/backend/examples/integrations/strapi-client.ts` - Strapi API client pattern
- `apps/backend/examples/integrations/strapi-service.ts` - Service layer with caching
- `apps/backend/examples/subscribers/product-updated.ts` - Subscriber example

---

## External Documentation

### Medusa Meilisearch Integration
- **Official Guide**: https://docs.medusajs.com/resources/integrations/guides/meilisearch
- **Key sections**:
  - Step 2: Create Meilisearch Module (service.ts pattern)
  - Step 4: Configure index settings
  - Step 6: Search in Next.js (InstantSearch setup)

### Internal Integration Guide
- **Location**: `/docs/meilisearch-integration-guide.md`
- **Key patterns**:
  - Medusa as Aggregator pattern (lines 27-48)
  - Module definition (lines 96-176)
  - Subscriber implementation (lines 201-290)
  - Storefront search client (lines 813-889)

### Meilisearch JavaScript SDK
- **Documentation**: https://www.meilisearch.com/docs/learn/getting_started/quick_start
- **Key methods**: `index.addDocuments()`, `index.search()`, `index.updateSettings()`

### React InstantSearch
- **Documentation**: https://www.algolia.com/doc/guides/building-search-ui/what-is-instantsearch/react/
- **Components**: InstantSearch, SearchBox, Hits, RefinementList, Pagination

---

## Technical Design

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EVENT TRIGGER                                │
│  product.created / product.updated / product.deleted                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Subscriber: src/subscribers/meilisearch-product-index.ts          │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 1. Resolve services (productModule, strapiModule, logger)     │ │
│  │ 2. Fetch Product from Medusa (with variants, images, etc.)    │ │
│  │ 3. Fetch Product Description from Strapi (non-blocking)       │ │
│  │ 4. Merge data into search document                            │ │
│  │ 5. Index to Meilisearch via meilisearchModule                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MEILISEARCH INDEX                                 │
│  {                                                                   │
│    id, title, handle, thumbnail, price, currency_code,              │
│    variants, categories, tags, images,                              │
│    // Enriched from Strapi                                          │
│    rich_description, features, specifications,                   │
│    seo_title, seo_description, meta_keywords                        │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STOREFRONT SEARCH                                 │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 1. User types in search box                                    │ │
│  │ 2. React InstantSearch queries Meilisearch directly            │ │
│  │ 3. Results displayed instantly (typeahead)                     │ │
│  │ 4. Full results page with faceting (filters, sorting)          │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Database Changes

**No database migrations required**. Meilisearch stores its own index.

### API Endpoints

#### No new backend endpoints required
Meilisearch is queried directly from the storefront using the search-only API key.

#### Storefront uses Meilisearch directly
- **Search endpoint**: Meilisearch (via `@meilisearch/instant-meilisearch`)
- **Authentication**: Search-only API key (public)

### Component Architecture

```
apps/storefront/
├── lib/
│   └── meilisearch/
│       ├── client.ts              # Meilisearch client configuration
│       └── search.ts              # Search helper functions
├── modules/
│   └── search/
│       ├── components/
│       │   ├── search-dialog/     # Updated to use InstantSearch
│       │   ├── search-box/        # Updated to use InstantSearch
│       │   └── instant-search/    # NEW: InstantSearch wrapper
│       ├── actions.ts             # Updated to use Meilisearch
│       └── templates/
│           └── search-results-template/
│               └── index.tsx      # Updated with InstantSearch components
```

### Type Definitions

**Location**: `packages/shared-types/src/meilisearch.ts`

```typescript
/**
 * Meilisearch search document structure
 * This represents the indexed product with enriched Strapi content
 */
export interface MeilisearchProductDocument {
  // Core Medusa fields
  id: string;
  title: string;
  handle: string;
  subtitle?: string;
  description?: string;
  thumbnail?: string;
  status: string;

  // Pricing
  price: number;
  currency_code: string;

  // Variants for filtering
  variants: Array<{
    id: string;
    title: string;
    options: Record<string, string>;
  }>;

  // Categories for faceting
  categories: string[];

  // Tags
  tags: string[];

  // Images
  images: string[];

  // Enriched from Strapi Product Description
  rich_description?: string;
  features?: string[];
  specifications?: Record<string, unknown>;
  seo_title?: string;
  seo_description?: string;
  meta_keywords?: string[];

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Meilisearch module configuration
 */
export interface MeilisearchModuleConfig {
  host: string;
  apiKey: string;
  productIndexName: string;
  settings?: MeilisearchIndexSettings;
}

/**
 * Meilisearch index settings
 */
export interface MeilisearchIndexSettings {
  filterableAttributes: string[];
  sortableAttributes: string[];
  searchableAttributes: string[];
  displayedAttributes: string[];
  rankingRules: string[];
}
```

---

## Implementation Plan

### Phase 1: Shared Types & Configuration

**Workspace**: `packages/shared-types`

**Steps**:

1. **Create Meilisearch types**
   - File: `packages/shared-types/src/meilisearch.ts`
   - Add `MeilisearchProductDocument`, `MeilisearchModuleConfig`, `MeilisearchIndexSettings`
   - Export from `packages/shared-types/src/index.ts`
   - **Validation**: `pnpm --filter=@3dbyte-tech-store/shared-types build` succeeds

### Phase 2: Backend - Meilisearch Module

**Workspace**: `apps/backend`

**Steps**:

1. **Install dependencies**
   ```bash
   cd apps/backend
   pnpm add meilisearch
   ```

2. **Create Meilisearch module service**
   - File: `apps/backend/src/modules/meilisearch/service.ts`
   - Initialize Meilisearch client with host and API key
   - Implement methods:
     - `indexData(data, type)` - Index documents
     - `deleteFromIndex(documentIds, type)` - Delete documents
     - `search(query, options)` - Search documents (optional, for admin)
     - `configureIndex(settings)` - Configure index settings
   - **Validation**: TypeScript compiles, no errors

3. **Create module definition**
   - File: `apps/backend/src/modules/meilisearch/index.ts`
   - Export module using `Module()` from `@medusajs/framework/utils`
   - Export `MEILISEARCH_MODULE` constant
   - **Validation**: Module pattern matches existing modules

4. **Register module in config**
   - File: `apps/backend/medusa-config.ts`
   - Add meilisearch module to `modules` array
   - Configure with env vars (host, apiKey, productIndexName)
   - **Validation**: Server starts without errors

5. **Configure index settings**
   - Add method to configure filterable/sortable/searchable attributes
   - Configure: filterable (price, categories, tags), sortable (price, title), searchable (title, description, rich_description)

### Phase 3: Backend - Product Indexing Subscribers

**Workspace**: `apps/backend`

**Steps**:

1. **Create product indexing subscriber**
   - File: `apps/backend/src/subscribers/meilisearch-product-index.ts`
   - Events: `product.created`, `product.updated`
   - Implementation:
     ```typescript
     export default async function productIndexer({
       data: { id: productId },
       container,
     }: SubscriberArgs<{ id: string }>) {
       // 1. Resolve services
       const productModule = container.resolve(Modules.PRODUCT);
       const strapiModule = container.resolve(STRAPI_MODULE);
       const meilisearchModule = container.resolve(MEILISEARCH_MODULE);
       const logger = container.resolve("logger");

       // 2. Fetch product from Medusa with relations
       const [product] = await productModule.listProducts({
         filters: { id: productId },
         relations: ["variants", "images", "categories", "tags"],
       });

       if (!product) return;

       // 3. Fetch Strapi content (non-blocking)
       let enrichedContent: StrapiProductDescription | null = null;
       try {
         enrichedContent = await strapiModule.getProductDescription(productId);
       } catch (e) {
         logger.warn(`Strapi fetch failed for ${productId}, indexing with base data`);
       }

       // 4. Construct search document (THE MERGE)
       const document = toMeilisearchDocument(product, enrichedContent);

       // 5. Index to Meilisearch
       await meilisearchModule.indexData([document], "product");
     }
     ```
   - **Validation**: Product indexing works on create/update

2. **Create product deletion subscriber**
   - File: `apps/backend/src/subscribers/meilisearch-product-delete.ts`
   - Event: `product.deleted`
   - Implementation: Call `meilisearchModule.deleteFromIndex([productId])`
   - **Validation**: Product removed from index on delete

3. **Add utility function for document transformation**
   - File: `apps/backend/src/modules/meilisearch/utils.ts`
   - Function: `toMeilisearchDocument(product, strapiContent)`
   - Merges Medusa product data with Strapi enriched content
   - **Validation**: Output matches `MeilisearchProductDocument` type

### Phase 4: Backend - Manual Sync Workflow (Optional)

**Workspace**: `apps/backend`

**Steps**:

1. **Create manual sync workflow** (for initial population)
   - File: `apps/backend/src/workflows/meilisearch-sync-products.ts`
   - Fetch all published products
   - For each product: fetch Strapi content, merge, index
   - Use pagination for large datasets
   - **Validation**: All products indexed correctly

### Phase 5: Storefront - Meilisearch Client

**Workspace**: `apps/storefront`

**Steps**:

1. **Install dependencies**
   ```bash
   cd apps/storefront
   pnpm add @meilisearch/instant-meilisearch react-instantsearch
   ```

2. **Create Meilisearch client**
   - File: `apps/storefront/src/lib/meilisearch/client.ts`
   - Configure `instantMeiliSearch` with host and search-only API key
   - Export `searchClient`
   - **Validation**: Client initializes correctly

3. **Create search helpers**
   - File: `apps/storefront/src/lib/meilisearch/search.ts`
   - Helper functions for direct Meilisearch queries (if needed)
   - **Validation**: Functions return expected data

### Phase 6: Storefront - Search Components

**Workspace**: `apps/storefront`

**Steps**:

1. **Update search action**
   - File: `apps/storefront/src/modules/search/actions.ts`
   - Replace Medusa API fetch with Meilisearch query
   - Keep same interface for backwards compatibility
   - **Validation**: Search returns results from Meilisearch

2. **Create InstantSearch wrapper**
   - File: `apps/storefront/src/modules/search/components/instant-search/index.tsx`
   - Wrap with `InstantSearch` from `react-instantsearch`
   - Configure index and search client
   - **Validation**: Component renders without errors

3. **Update search dialog**
   - File: `apps/storefront/src/modules/search/components/search-dialog/index.tsx`
   - Replace with InstantSearch `SearchBox` and `Hits`
   - Add debounced input for typeahead
   - **Validation**: Search dialog shows instant results

4. **Update search results page**
   - File: `apps/storefront/src/modules/search/templates/search-results-template/index.tsx`
   - Replace with InstantSearch components:
     - `Configure` for search parameters
     - `Hits` for results grid
     - `RefinementList` for filters (categories, price ranges)
     - `SortBy` for sorting
     - `Pagination` for pagination
   - **Validation**: Results page works with faceting

### Phase 7: Environment Configuration

**All Workspaces**

**Steps**:

1. **Backend environment variables** (`apps/backend/.env`)
   ```bash
   MEILISEARCH_HOST=http://localhost:7700
   MEILISEARCH_API_KEY=your-master-key
   MEILISEARCH_PRODUCT_INDEX_NAME=products
   ```

2. **Storefront environment variables** (`apps/storefront/.env.local`)
   ```bash
   NEXT_PUBLIC_MEILISEARCH_HOST=http://localhost:7700
   NEXT_PUBLIC_MEILISEARCH_API_KEY=your-search-only-key
   NEXT_PUBLIC_MEILISEARCH_INDEX_NAME=products
   ```

3. **Create Meilisearch instance** (if not already running)
   ```bash
   # Using Docker
   docker run -it -p 7700:7700 -v $(pwd)/meili_data:/meili_data \
     getmeili/meilisearch:v1.5 \
     ./meilisearch --master-key=masterKey
   ```

### Phase 8: Integration & Testing

**All Workspaces**

**Steps**:

1. **Start all services**
   ```bash
   pnpm run dev
   ```

2. **Create a test product in Medusa Admin**
   - Verify product is indexed in Meilisearch

3. **Add enriched content in Strapi**
   - Create product description for the product
   - Trigger product update in Medusa
   - Verify enriched data is indexed

4. **Test storefront search**
   - Type in search box - verify instant results
   - Navigate to results page - verify faceting works
   - Test filters (categories, price ranges)
   - Test sorting (price, title, relevance)

5. **Run tests**
   ```bash
   pnpm run test
   ```

6. **Type check**
   ```bash
   pnpm run type-check
   ```

7. **Lint**
   ```bash
   pnpm run lint
   ```

---

## Testing Strategy

### Unit Tests

**Backend Module** (`apps/backend/src/modules/meilisearch/__tests__/service.spec.ts`):
- [ ] `indexData()` correctly formats and sends documents
- [ ] `deleteFromIndex()` handles empty arrays
- [ ] `search()` returns properly typed results
- [ ] Error handling for Meilisearch connection failures

**Subscriber Tests** (`apps/backend/src/subscribers/__tests__/meilisearch-product-index.spec.ts`):
- [ ] Product created triggers indexing
- [ ] Product updated triggers reindexing
- [ ] Product deleted triggers removal from index
- [ ] Strapi fetch failure doesn't break indexing

**Storefront Search** (`apps/storefront/src/modules/search/__tests__/actions.spec.ts`):
- [ ] Search action queries Meilisearch correctly
- [ ] Results are transformed correctly
- [ ] Error handling works

### Integration Tests

**Backend Integration** (`apps/backend/src/__tests__/integration/meilisearch.spec.ts`):
- [ ] End-to-end product indexing flow
- [ ] Strapi enrichment integration
- [ ] Meilisearch index settings applied correctly

**Storefront Integration** (`apps/storefront/src/__tests__/integration/search.spec.ts`):
- [ ] Search results page renders with Meilisearch data
- [ ] Filters work correctly
- [ ] Sorting works correctly

### E2E Tests

**Playwright Tests** (`apps/storefront/e2e/search.spec.ts`):
- [ ] User can search and see results
- [ ] User can filter by category
- [ ] User can sort by price
- [ ] Search autocomplete works

---

## Edge Cases & Error Handling

### Error Scenarios

1. **Meilisearch is unreachable**
   - **Cause**: Meilisearch service down or network issue
   - **Handling**: Log error, return graceful response to user, don't crash
   - **User impact**: Search unavailable, show "Search temporarily unavailable" message

2. **Strapi fetch fails**
   - **Cause**: Strapi service down or API error
   - **Handling**: Log warning, continue with base Medusa data
   - **User impact**: Product indexed but without enriched content

3. **Product has no variants**
   - **Cause**: Product configuration issue
   - **Handling**: Use default price of 0, handle null values
   - **User impact**: Product appears in search but may show $0 price

4. **Large product dataset**
   - **Cause**: Thousands of products to index
   - **Handling**: Use batching in sync workflow, add progress logging
   - **User impact**: Initial sync may take several minutes

### Edge Cases

1. **Product title/description contains special characters**
   - **Scenario**: Product with emojis, HTML entities, etc.
   - **Handling**: Meilisearch handles this natively, no special treatment needed

2. **Same product indexed multiple times**
   - **Scenario**: Race condition in event handling
   - **Handling**: Meilisearch uses id as primary key, overwrites existing document

3. **Search query contains SQL injection patterns**
   - **Scenario**: User searches for malicious input
   - **Handling**: Meilisearch is a NoSQL search engine, SQL injection not applicable

4. **Faceting on fields with many values**
   - **Scenario**: Thousands of categories or tags
   - **Handling**: Configure `maxValuesPerFacet` in Meilisearch settings (default: 100)

---

## Performance Considerations

### Backend
- [ ] Use batching for bulk indexing operations (100 products per batch)
- [ ] Implement debouncing for rapid product updates
- [ ] Use async subscribers to avoid blocking main request
- [ ] Add retry logic for Meilisearch API failures

### Storefront
- [ ] Use `instantsearch` with `stalledSearchDelay` for perceived performance
- [ ] Implement result caching with short TTL (30 seconds)
- [ ] Lazy load product images in search results
- [ ] Use virtual scrolling for large result sets

### Meilisearch
- [ ] Configure `searchCutoffMs` to return partial results if query is slow
- [ ] Use `proximity` ranking for typo tolerance
- [ ] Enable `typoTolerance` for better user experience

---

## Security Considerations

- [ ] **Master key vs search-only key**: Use master key only in backend, search-only in storefront
- [ ] **Environment variables**: Never commit API keys to git
- [ ] **CORS**: Configure Meilisearch CORS to only allow storefront origin
- [ ] **Input sanitization**: Meilisearch handles this, but validate search params in storefront
- [ ] **Rate limiting**: Configure Meilisearch rate limiting for public search endpoint

---

## Documentation Updates

### Files to Update
- [ ] `README.md` - Add Meilisearch setup instructions
- [ ] `apps/backend/CLAUDE.md` - Add Meilisearch module pattern
- [ ] `apps/storefront/CLAUDE.md` - Add InstantSearch pattern

### New Documentation
- [ ] `docs/features/meilisearch-search.md` - Feature overview
- [ ] `docs/api/meilisearch.md` - Search API documentation
- [ ] `docs/deployment/meilisearch.md` - Production deployment guide

---

## Success Criteria

### Functional
- [ ] Products are automatically indexed when created/updated in Medusa
- [ ] Indexed products include enriched content from Strapi
- [ ] Storefront search returns fast, relevant results
- [ ] Faceting works (categories, price ranges, tags)
- [ ] Sorting works (relevance, price, title)

### Technical
- [ ] All tests passing (>80% coverage)
- [ ] TypeScript compiles with no errors
- [ ] No linting errors
- [ ] All builds successful
- [ ] No console errors or warnings

### Performance
- [ ] Search queries < 100ms
- [ ] Indexing < 1s per product
- [ ] Initial sync of 1000 products < 5 minutes
- [ ] Storefront search results appear instantly (typeahead)

### Quality
- [ ] Code reviewed
- [ ] Documentation complete
- [ ] Accessible (WCAG AA)
- [ ] Mobile responsive

---

## Rollback Plan

If something goes wrong:

1. **Disable subscribers**:
   ```bash
   # Comment out subscribers in medusa-config.ts or set enabled: false
   ```

2. **Remove Meilisearch module**:
   ```bash
   # Remove module registration from medusa-config.ts
   ```

3. **Restore storefront search**:
   ```bash
   # Revert search/action.ts to use Medusa API
   git revert <commit-hash>
   ```

4. **Clear Meilisearch index** (if needed):
   ```bash
   curl -X POST http://localhost:7700/indexes/products/delete
   ```

---

## Post-Implementation Tasks

- [ ] Update changelog
- [ ] Create release notes
- [ ] Monitor Meilisearch performance metrics
- [ ] Set up monitoring for Meilisearch service health
- [ ] Configure alerts for indexing failures

---

## Confidence Assessment

**Score**: 9/10

**What we're confident about**:
- Clear patterns in the codebase for modules and subscribers
- Existing Strapi integration provides enrichment data
- Comprehensive documentation and examples available
- React InstantSearch is a well-established library
- Meilisearch has excellent JavaScript SDK

**What might need clarification**:
- Exact structure of Strapi product descriptions (need to verify field names)
- Whether to use the community plugin or custom module
- Index settings tuning (ranking rules, typo tolerance)

**Additional research needed**:
- Verify Strapi product description content type schema
- Test Meilisearch with actual product data size
- Performance testing with large datasets

---

## Notes & Assumptions

1. **Assumption**: Strapi has a `product-descriptions` content type with `medusa_product_id` field for linking to Medusa products
2. **Assumption**: Meilisearch is accessible at `http://localhost:7700` in development
3. **Note**: The existing Strapi module already has methods to fetch product descriptions - we'll reuse these
4. **Note**: The storefront uses Edge runtime - ensure Meilisearch client is compatible
5. **Note**: React InstantSearch requires client-side rendering - search components will need 'use client'

---

## Appendix: Code Patterns Reference

### Module Pattern (from existing codebase)

```typescript
// apps/backend/src/modules/meilisearch/index.ts
import { Module } from "@medusajs/framework/utils";
import MeilisearchModuleService from "./service";

export const MEILISEARCH_MODULE = "meilisearch";

export default Module(MEILISEARCH_MODULE, {
  service: MeilisearchModuleService,
});
```

### Subscriber Pattern (from existing codebase)

```typescript
// apps/backend/src/subscribers/meilisearch-product-index.ts
import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import { MEILISEARCH_MODULE } from "../modules/meilisearch";
import { STRAPI_MODULE } from "../modules/strapi";

export default async function productIndexer({
  data: { id: productId },
  container,
}: SubscriberArgs<{ id: string }>) {
  // Implementation
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
```

### InstantSearch Pattern (for storefront)

```typescript
// apps/storefront/src/modules/search/components/instant-search/index.tsx
'use client';

import { InstantSearch } from 'react-instantsearch';
import { searchClient } from '@lib/meilisearch/client';
import { SearchBox } from './search-box';
import { Hits } from './hits';

export function InstantSearchWrapper() {
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName="products"
    >
      <SearchBox />
      <Hits />
    </InstantSearch>
  );
}
```
