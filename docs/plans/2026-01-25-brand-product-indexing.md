# Brand Product Indexing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable filtering, sorting, and searching by brand in the storefront by indexing brand data with products in Meilisearch.

**Architecture:** Fetch brand data in the `sync-products` workflow, transform it into a nested object in the Meilisearch document, and configure index settings for filtering and sorting.

**Tech Stack:** TypeScript, Medusa v2 (Workflows), Meilisearch, Jest

---

### Task 1: Update Shared Types

**Files:**
- Modify: `packages/shared-types/src/meilisearch.ts`

**Step 1: Update MeilisearchProductDocument Interface**

Add the `brand` property to the `MeilisearchProductDocument` interface.

```typescript
// packages/shared-types/src/meilisearch.ts

export interface MeilisearchBrandObject {
  id: string
  name: string
  handle: string
}

export interface MeilisearchProductDocument {
  // ... existing fields
  brand?: MeilisearchBrandObject
  // ... existing fields
}
```

**Step 2: Update SyncProductsStepProduct Interface**

Add the `brand` relation to the input type for the sync step.

```typescript
// packages/shared-types/src/meilisearch.ts

export interface SyncProductsStepProduct {
  // ... existing fields
  brand?: {
    id: string
    name: string
    handle: string
  } | null
}
```

**Step 3: Commit**

```bash
git add packages/shared-types/src/meilisearch.ts
git commit -m "chore(shared-types): add brand definitions to meilisearch types"
```

---

### Task 2: Create Failing Integration Test

**Files:**
- Create: `apps/backend/src/modules/meilisearch/utils/__tests__/product.unit.spec.ts`

**Step 1: Write the test skeleton**

Create a unit test to verify the transformer logic.

```typescript
import { toMeilisearchDocument } from "../product"
import type {
	SyncProductsStepProduct,
	StrapiProductDescription,
	MeilisearchProductDocument,
} from "@3dbyte-tech-store/shared-types"

describe("toMeilisearchDocument", () => {
	const mockProduct: SyncProductsStepProduct = {
		id: "prod_123",
		title: "Test Product",
		handle: "test-product",
		status: "published",
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-01T00:00:00Z",
		variants: [
			{
				id: "variant_1",
				prices: [{ amount: 1000, currency_code: "usd" }],
			},
		],
		brand: {
			id: "brand_123",
			name: "Test Brand",
			handle: "test-brand",
		},
	}

	it("should include brand object in the Meilisearch document", () => {
		const result = toMeilisearchDocument(mockProduct)

		expect(result).toHaveProperty("brand")
		expect(result.brand).toEqual({
			id: "brand_123",
			name: "Test Brand",
			handle: "test-brand",
		})
	})

	it("should handle product without brand", () => {
		const productWithoutBrand = { ...mockProduct, brand: null }
		const result = toMeilisearchDocument(productWithoutBrand)

		expect(result.brand).toBeUndefined()
	})
})
```

**Step 2: Run test to confirm failure**

```bash
pnpm --filter=@3dbyte-tech-store/backend test:unit src/modules/meilisearch/utils/__tests__/product.unit.spec.ts
```

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/utils/__tests__/product.unit.spec.ts
git commit -m "test(backend): add failing test for brand indexing"
```

---

### Task 3: Implement Data Fetching

**Files:**
- Modify: `apps/backend/src/workflows/meilisearch/products/sync-products.ts`

**Step 1: Add brand fields to useQueryGraphStep**

Update the fields list to include brand properties.

```typescript
// apps/backend/src/workflows/meilisearch/products/sync-products.ts

// ... inside useQueryGraphStep fields array
"tags.value",
"brand.id",
"brand.name",
"brand.handle",
// ...
```

**Step 2: Commit**

```bash
git add apps/backend/src/workflows/meilisearch/products/sync-products.ts
git commit -m "feat(backend): fetch brand data in sync-products workflow"
```

---

### Task 4: Implement Transformer & Index Settings

**Files:**
- Modify: `apps/backend/src/modules/meilisearch/utils/product.ts`
- Modify: `apps/backend/src/modules/meilisearch/utils/index.ts`

**Step 1: Update Transformer**

Map the fetched brand data to the document structure.

```typescript
// apps/backend/src/modules/meilisearch/utils/product.ts

export function toMeilisearchDocument(...) {
  // ...

  const brand = product.brand ? {
    id: product.brand.id,
    name: product.brand.name,
    handle: product.brand.handle,
  } : undefined

  return {
    // ...
    brand,
    // ...
  }
}
```

**Step 2: Update Index Settings**

Configure Meilisearch settings for the new fields.

```typescript
// apps/backend/src/modules/meilisearch/utils/index.ts

export const DEFAULT_INDEX_SETTINGS: MeilisearchIndexSettings = {
  filterableAttributes: [
    // ... existing
    "brand.id",
    "brand.handle",
  ],
  sortableAttributes: [
    // ... existing
    "brand.name",
  ],
  searchableAttributes: [
    // ... existing
    "brand.name",
  ],
  displayedAttributes: [
    // ... existing
    "brand",
  ],
  // ...
}
```

**Step 3: Verify with Test**

Now the test should pass.

```bash
pnpm --filter=@3dbyte-tech-store/backend test:unit src/modules/meilisearch/utils/__tests__/product.unit.spec.ts
```

**Step 4: Commit**

```bash
git add apps/backend/src/modules/meilisearch/utils/product.ts apps/backend/src/modules/meilisearch/utils/index.ts
git commit -m "feat(backend): transform and configure brand index settings"
```
