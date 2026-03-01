# Storefront V3 Meilisearch Index Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Optimize Meilisearch product indexing by creating a flattened, lightweight schema that separates searchable content from display data and implements region-aware pricing.

**Architecture:**
- **Transformer:** Logic in `apps/backend/src/modules/meilisearch/utils/product.ts` to flatten product data (variants, options, prices) into a single document.
- **Region-Aware Pricing:** Iterate through all active regions, calculate context-specific prices, and store as `price_<region_currency>`.
- **Index Settings:** New loader `ConfigureProductIndexService` that scans DB for option titles and updates Meilisearch index settings (filterableAttributes) on startup.
- **Shared Types:** Update `MeilisearchProductDocument` in `packages/shared-types` to reflect the new schema.

**Tech Stack:** TypeScript, Medusa v2, Meilisearch, Context7

---

### Task 1: Update Shared Types

**Files:**
- Modify: `packages/shared-types/src/meilisearch.ts` (or wherever `MeilisearchProductDocument` is defined)

**Step 1: Update Interface Definition**

Update the `MeilisearchProductDocument` interface to match the new flat schema.

```typescript
export interface MeilisearchProductDocument {
  // --- 1. CORE IDENTITY ---
  id: string
  title: string
  handle: string
  thumbnail?: string
  created_at_timestamp: number

  // --- 2. PRODUCT TYPE ---
  type_id?: string
  type_value?: string

  // --- 3. MULTI-CURRENCY PRICING ---
  // Dynamic keys: price_aud, price_usd, etc.
  [key: `price_${string}`]: number | undefined
  on_sale: boolean

  // --- 4. INVENTORY & AVAILABILITY ---
  inventory_quantity: number
  in_stock: boolean

  // --- 5. FACETS (Filtering) ---
  materials?: string[]
  // Dynamic keys: options_color, options_size, etc.
  [key: `options_${string}`]: string[] | undefined

  // --- 6. NAVIGATION ---
  category_ids: string[]
  categories: string[]
  tags: string[]
  collection_ids: string[]

  // --- 7. BRAND ---
  brand?: {
    id: string
    name: string
    handle: string
    logo?: string
  }

  // --- 8. SEARCHABLE CONTENT (Not in display payload ideally, but indexed) ---
  detailed_description?: string

  // --- 9. VARIANTS (SKU Search) ---
  variants: Array<{
    id: string
    sku?: string
    title: string
  }>
}
```

**Step 2: Verify Compilation**

Run: `pnpm --filter=@3dbyte-tech-store/shared-types build`
Expected: Success

**Step 3: Commit**

```bash
git add packages/shared-types/src/meilisearch.ts
git commit -m "feat(shared-types): update meilisearch product schema for v3 optimization"
```

---

### Task 2: Implement Transformer Logic (Part 1: Basic Flattening)

**Files:**
- Modify: `apps/backend/src/modules/meilisearch/utils/product.ts`

**Step 1: Update `toMeilisearchDocument` Function Signature**

Change the function to accept `regions` (needed for pricing) or fetch them if not passed (better to pass them in `sync-products` step). For now, let's assume we pass the region context or fetch it.

*Wait, `toMeilisearchDocument` is a sync utility function. It cannot fetch data.*
We must update the **Workflow Step** to fetch regions first, then pass them to the transformer.

**Let's stick to the transformer logic here.**

**Step 2: Implement Option Flattening**

```typescript
// Helper to normalize option titles
function normalizeOptionKey(title: string): string {
  return `options_${title.toLowerCase().replace(/\s+/g, '_')}`;
}

// Inside toMeilisearchDocument...
const optionsMap: Record<string, Set<string>> = {};

product.variants?.forEach(variant => {
  variant.options?.forEach(opt => {
    const key = normalizeOptionKey(opt.option?.title || opt.option_title || "Option");
    if (!optionsMap[key]) optionsMap[key] = new Set();
    optionsMap[key].add(opt.value);
  });
});

// Convert Sets to Arrays for the final object
const flattenedOptions = Object.entries(optionsMap).reduce((acc, [key, val]) => {
  acc[key] = Array.from(val);
  return acc;
}, {} as Record<string, string[]>);
```

**Step 3: Implement Basic Field Mapping**

Map `id`, `title`, `handle`, `type_value` (from `product.type.value`), `brand` (simple object), `categories` (names), `category_ids`, `tags` (values).

**Step 4: Commit**

```bash
git add apps/backend/src/modules/meilisearch/utils/product.ts
git commit -m "feat(backend): implement basic flattening logic for meilisearch transformer"
```

---

### Task 3: Implement Transformer Logic (Part 2: Region-Aware Pricing)

**Files:**
- Modify: `apps/backend/src/workflows/meilisearch/products/steps/sync-products.ts` (Fetch regions)
- Modify: `apps/backend/src/modules/meilisearch/utils/product.ts` (Calculate prices)

**Step 1: Update Workflow Step to Fetch Regions**

In `sync-products.ts`, before mapping products:
1. Resolve `remoteQuery`.
2. Fetch all active regions: `const regions = await remoteQuery.region.list({ fields: ['id', 'currency_code'] })`.
3. Pass `regions` to `toMeilisearchDocument`.

**Step 2: Update Transformer to Calculate Prices**

*Challenge: `pricingModuleService.calculatePrices` is async and requires a service instance. We cannot do this inside a pure utility function easily if we want to keep it simple.*

**Alternative Strategy:**
The `product` object passed to `toMeilisearchDocument` usually comes from `useQueryGraphStep`.
We should ensure the product *already has* calculated prices for all regions? No, that's expensive.

**Better Approach:**
In `sync-products.ts`, we already iterate products.
We need to calculate prices *before* calling the transformer.

Actually, for the search index, we can just use the **Variant Prices** array directly if it's populated.
`variant.prices` contains raw prices.

**Logic:**
Iterate `regions`. For each region, find the price in `variant.prices` that matches `region.currency_code` (and `region_id` if specific).
This avoids calling the expensive `pricingModuleService` for every product during sync if we trust the raw prices.

*Refined Plan for Transformer:*
1. Receive `regions` list.
2. For each product:
   For each region:
     Find lowest price across all variants for this `currency_code` (and `region_id` match if exists).
     Set `price_<currency_code> = lowest_price`.

```typescript
// Inside transformer
const prices: Record<string, number> = {};

regions.forEach(region => {
  let minPrice = Infinity;
  let found = false;

  product.variants?.forEach(v => {
    // Find price for this region or currency
    const priceObj = v.prices?.find(p =>
      p.rules?.region_id === region.id ||
      (!p.rules?.region_id && p.currency_code === region.currency_code)
    );

    if (priceObj) {
      if (priceObj.amount < minPrice) {
        minPrice = priceObj.amount;
        found = true;
      }
    }
  });

  if (found) {
    prices[`price_${region.currency_code}`] = minPrice;
  }
});
```

**Step 3: Commit**

```bash
git add apps/backend/src/workflows/meilisearch/products/steps/sync-products.ts
git add apps/backend/src/modules/meilisearch/utils/product.ts
git commit -m "feat(backend): implement region-aware price calculation for meilisearch"
```

---

### Task 4: Implement Index Settings Loader ("Scan & Update")

**Files:**
- Create: `apps/backend/src/loaders/configure-meilisearch-settings.ts`

**Step 1: Define the Loader**

```typescript
import { LoaderOptions } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function configureMeilisearchSettings({ container }: LoaderOptions) {
  const meilisearchService = container.resolve("meilisearch") // Resolve your module
  const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  // 1. Fetch all unique option titles
  const options = await remoteQuery.product_option.list({ fields: ['title'] })
  const uniqueTitles = [...new Set(options.map(o => o.title))]

  // 2. Normalize
  const dynamicAttributes = uniqueTitles.map(t => `options_${t.toLowerCase().replace(/\s+/g, '_')}`)

  // 3. Define Static Attributes
  const staticAttributes = [
    "id", "handle", "brand.id", "category_ids", "type_id", "on_sale", "in_stock",
    // We might need to fetch regions here too to add price_* attributes!
  ]

  // Fetch regions for price attributes
  const regions = await remoteQuery.region.list({ fields: ['currency_code'] })
  const priceAttributes = [...new Set(regions.map(r => `price_${r.currency_code}`))]

  // 4. Update Settings
  const filterableAttributes = [...staticAttributes, ...priceAttributes, ...dynamicAttributes]

  await meilisearchService.updateSettings("products", {
    filterableAttributes,
    searchableAttributes: ["title", "detailed_description", "variants.sku", "variants.title"],
    sortableAttributes: ["created_at_timestamp", ...priceAttributes],
    displayedAttributes: [
       "id", "title", "handle", "thumbnail", "price_*", "options_*", "brand"
       // Note: Wildcards might not be supported in displayedAttributes depending on version
       // Better to be explicit or leave default (all) and trust frontend not to use _search_*
       // Actually, we want to EXCLUDE _search_* fields if possible, or just accept big payload?
       // Let's stick to explicit list if possible, or just "*"
    ]
  })
}
```

*Correction:* Meilisearch `displayedAttributes` default is `*`. If we name our search-only fields `_search_description`, they are still returned unless we explicitly exclude them.
Let's set `displayedAttributes` to the known list + dynamic ones we just built.

**Step 2: Register Loader**

Ensure it's exported in `apps/backend/src/loaders/index.ts` if needed, or Medusa v2 auto-loads from `loaders` dir? (Medusa v2 uses `medusa-config.ts` or just `src/loaders` convention? V2 usually requires explicit registration or `src/loaders/*.ts` depending on setup. We will check existing loaders.)

**Step 3: Commit**

```bash
git add apps/backend/src/loaders/configure-meilisearch-settings.ts
git commit -m "feat(backend): add loader to dynamically configure meilisearch index settings"
```

---

### Task 5: Scheduled Job for Nightly Updates

**Files:**
- Create: `apps/backend/src/jobs/sync-meilisearch-settings.ts`

**Step 1: Create Job**

Reuse the logic from the loader (extract to a service `ConfigureProductIndexService` if possible, or just duplicate the simple logic for now since it's a script).

```typescript
import { MedusaContainer } from "@medusajs/framework/types"

export default async function syncMeilisearchSettings(container: MedusaContainer) {
  // Same logic as loader...
}

export const config = {
  name: "sync-meilisearch-settings",
  schedule: "0 3 * * *", // 3 AM daily
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/jobs/sync-meilisearch-settings.ts
git commit -m "feat(backend): add nightly job to sync meilisearch settings"
```

---

### Task 6: Run & Verify

**Files:**
- None (Action)

**Step 1: Restart Backend**
Start the backend to trigger the loader.

**Step 2: Trigger Sync**
Manually trigger `POST /admin/meilisearch/sync-products`.

**Step 3: Check Meilisearch**
Use `curl` or browser to check the index `products`.
Verify the document structure matches the new schema.
Verify `filterableAttributes` contains the dynamic option fields.

---
