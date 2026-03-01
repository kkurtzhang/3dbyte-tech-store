# Meilisearch Module Reorganization

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize the meilisearch module structure for better maintainability and remove backend-only types from shared-types.

**Architecture:**
- Create new folder structure: `service/`, `transformers/`, `settings/`, `types/`
- Move index settings from `service.ts` to dedicated `settings/` files
- Move transformer functions from `utils/` to `transformers/`
- Create proper barrel exports (index.ts) for each folder
- Remove backend-only types from `packages/shared-types/src/meilisearch.ts`

**Tech Stack:** TypeScript, Medusa v2 Module System

---

## Task 1: Create new folder structure

**Files:**
- Create: `apps/backend/src/modules/meilisearch/service/`
- Create: `apps/backend/src/modules/meilisearch/transformers/`
- Create: `apps/backend/src/modules/meilisearch/settings/`
- Create: `apps/backend/src/modules/meilisearch/types/`

**Step 1: Create service directory**

```bash
mkdir -p apps/backend/src/modules/meilisearch/service
```

**Step 2: Create transformers directory**

```bash
mkdir -p apps/backend/src/modules/meilisearch/transformers
```

**Step 3: Create settings directory**

```bash
mkdir -p apps/backend/src/modules/meilisearch/settings
```

**Step 4: Create types directory**

```bash
mkdir -p apps/backend/src/modules/meilisearch/types
```

**Step 5: Verify directories created**

```bash
ls -la apps/backend/src/modules/meilisearch/
```

Expected output: Shows service/, transformers/, settings/, types/ directories

**Step 6: Commit**

```bash
git add apps/backend/src/modules/meilisearch/
git commit -m "refactor(meilisearch): create new folder structure for reorganization"
```

---

## Task 2: Create settings/category.ts

**Files:**
- Create: `apps/backend/src/modules/meilisearch/settings/category.ts`

**Step 1: Create category settings file**

```typescript
import type { MeilisearchIndexSettings } from "@3dbyte-tech-store/shared-types"

/**
 * Category index settings for Meilisearch
 * Optimized for category browse pages and autocomplete
 */
export const CATEGORY_INDEX_SETTINGS: MeilisearchIndexSettings = {
	// 1. SEARCHABLE
	// Users search by Name ("Shoes") or Breadcrumb ("Men").
	// 'handle' is searchable in case someone searches by a URL slug they saw.
	searchableAttributes: ["name", "display_path", "handle"],

	// 2. FILTERABLE
	// Critical for the frontend to hide empty categories or build specific menus.
	filterableAttributes: [
		"id",
		"category_ids", // For filtering by multiple categories
		"parent_category_id", // Essential for "Get all sub-categories of X"
		"product_count", // Filter: "product_count > 0"
		"created_at", // Filter: "created_at > 170000..." (New categories)
	],

	// 3. SORTABLE
	// Categories are rarely sorted by date.
	// They are sorted by "Rank" (Manual order) or "Popularity" (Traffic).
	sortableAttributes: ["rank", "product_count", "name", "created_at"],

	// 4. RANKING RULES
	// This is the "Secret Sauce".
	// We modify the standard rules to prioritizing your 'rank' field above text relevance.
	rankingRules: [
		"words",
		"typo",
		"sort", // <--- Moved UP (Default is #5). Important!
		"proximity",
		"attribute",
		"exactness",
		"product_count:desc", // Boost categories with more products
	],

	// 5. DISPLAYED
	// Keep the payload light. Don't send internal flags.
	displayedAttributes: [
		"id",
		"name",
		"handle",
		"description",
		"display_path",
		"breadcrumb",     // For rich display: Link > Link > Link
		"product_count",
		"rank",
	],

	// 6. TYPO TOLERANCE
	// Optional: Prevent "shos" from matching "shoes" if you want strictness.
	// Usually, default is fine.
	typoTolerance: {
		minWordSizeForTypos: {
			oneTypo: 4,
			twoTypos: 8
		}
	},

	// 7. FACETING & PAGINATION
	faceting: {
		maxValuesPerFacet: 100,
	},
	pagination: {
		maxTotalHits: 10000,
	},
}
```

**Step 2: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/settings/category.ts
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/settings/category.ts
git commit -m "refactor(meilisearch): extract category index settings to dedicated file"
```

---

## Task 3: Create settings/brand.ts

**Files:**
- Create: `apps/backend/src/modules/meilisearch/settings/brand.ts`

**Step 1: Create brand settings file**

```typescript
import type { MeilisearchIndexSettings } from "@3dbyte-tech-store/shared-types"

/**
 * Brand index settings for Meilisearch
 * Optimized for brand filtering and brand pages
 */
export const BRAND_INDEX_SETTINGS: MeilisearchIndexSettings = {
	// 1. SEARCHABLE
	// Users search by brand name, description, or handle (URL slug)
	searchableAttributes: ["name", "rich_description", "handle"],

	// 2. FILTERABLE
	// Critical for filtering active brands, by ID, or by handle
	filterableAttributes: [
		"id",
		"handle",
		"created_at", // Filter: "created_at > timestamp" (New brands)
	],

	// 3. SORTABLE
	// Brands are commonly sorted by name (alphabetically), product count (popularity), or creation date
	sortableAttributes: ["name", "created_at", "product_count"],

	// 4. RANKING RULES
	// Standard relevance ranking for brand search
	rankingRules: [
		"words",
		"typo",
		"sort",
		"proximity",
		"attribute",
		"exactness",
	],

	// 5. DISPLAYED
	// Return relevant brand information for display
	displayedAttributes: [
		"id",
		"name",
		"handle",
		"brand_logo",
		"rich_description",
		"product_count",
	],

	// 6. TYPO TOLERANCE
	// Allow typos for better user experience
	typoTolerance: {
		minWordSizeForTypos: {
			oneTypo: 4,
			twoTypos: 8,
		},
	},

	// 7. FACETING & PAGINATION
	faceting: {
		maxValuesPerFacet: 100,
	},
	pagination: {
		maxTotalHits: 10000,
	},
}
```

**Step 2: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/settings/brand.ts
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/settings/brand.ts
git commit -m "refactor(meilisearch): extract brand index settings to dedicated file"
```

---

## Task 4: Create settings/product.ts

**Files:**
- Create: `apps/backend/src/modules/meilisearch/settings/product.ts`

**Step 1: Create product settings file**

```typescript
import type { MeilisearchIndexSettings } from "@3dbyte-tech-store/shared-types"

/**
 * Default index settings for Meilisearch product index
 */
export const PRODUCT_INDEX_SETTINGS: MeilisearchIndexSettings = {
	filterableAttributes: [
		"price",
		"categories",
		"tags",
		"status",
		"collection_ids",
		"type_ids",
		"material_ids",
	],
	sortableAttributes: ["price", "title", "created_at", "updated_at"],
	searchableAttributes: [
		"title",
		"description",
		"rich_description",
		"features",
		"tags",
		"categories",
	],
	displayedAttributes: [
		"id",
		"title",
		"handle",
		"subtitle",
		"description",
		"thumbnail",
		"price",
		"currency_code",
		"categories",
		"tags",
		"images",
		"rich_description",
		"features",
		"specifications",
		"status",
		"created_at",
		"updated_at",
	],
	rankingRules: [
		"words",
		"typo",
		"proximity",
		"attribute",
		"sort",
		"exactness",
		"created_at:desc",
	],
	typoTolerance: {
		enabled: true,
		minWordSizeForTypos: {
			oneTypo: 4,
			twoTypos: 8,
		},
	},
	faceting: {
		maxValuesPerFacet: 100,
	},
	pagination: {
		maxTotalHits: 10000,
	},
} as const
```

**Step 2: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/settings/product.ts
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/settings/product.ts
git commit -m "refactor(meilisearch): extract product index settings to dedicated file"
```

---

## Task 5: Create settings/index.ts

**Files:**
- Create: `apps/backend/src/modules/meilisearch/settings/index.ts`

**Step 1: Create settings barrel export**

```typescript
export { PRODUCT_INDEX_SETTINGS } from "./product"
export { CATEGORY_INDEX_SETTINGS } from "./category"
export { BRAND_INDEX_SETTINGS } from "./brand"
```

**Step 2: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/settings/index.ts
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/settings/index.ts
git commit -m "refactor(meilisearch): create settings barrel export"
```

---

## Task 6: Create types/sync.types.ts

**Files:**
- Create: `apps/backend/src/modules/meilisearch/types/sync.types.ts`

**Step 1: Create sync types file**

```typescript
/**
 * Category type from Medusa query (matches useQueryGraphStep output)
 *
 * Note: Date fields accept string | Date to match Medusa's ProductCategory type
 * from useQueryGraphStep. This ensures type compatibility when passing data
 * between workflow steps.
 */
export interface SyncCategoriesStepCategory {
	id: string
	name: string
	handle: string
	description?: string | null
	parent_category_id?: string | null
	parent_category?: SyncCategoriesStepCategory | null
	rank: number
	created_at: string | Date
	updated_at: string | Date
}
```

**Step 2: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/types/sync.types.ts
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/types/sync.types.ts
git commit -m "refactor(meilisearch): create sync types file"
```

---

## Task 7: Create types/index.ts

**Files:**
- Create: `apps/backend/src/modules/meilisearch/types/index.ts`

**Step 1: Create types barrel export**

```typescript
export type { SyncCategoriesStepCategory } from "./sync.types"
```

**Step 2: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/types/index.ts
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/types/index.ts
git commit -m "refactor(meilisearch): create types barrel export"
```

---

## Task 8: Create transformers/product.ts

**Files:**
- Create: `apps/backend/src/modules/meilisearch/transformers/product.ts`

**Step 1: Create product transformer file**

```typescript
import type {
	MeilisearchProductDocument,
	StrapiProductDescription,
	SyncProductsStepProduct,
} from "@3dbyte-tech-store/shared-types"

/**
 * Transform Medusa product and Strapi content into a Meilisearch document
 *
 * This function merges product data from Medusa with enriched content from Strapi,
 * creating a unified search document with all necessary fields for faceting and filtering.
 *
 * @param product - Medusa product with variants, images, categories, tags
 * @param strapiContent - Enriched content from Strapi (optional)
 * @returns Formatted Meilisearch document
 */
export function toMeilisearchDocument(
	product: SyncProductsStepProduct,
	strapiContent?: StrapiProductDescription | null
): MeilisearchProductDocument {
	// Extract pricing from first variant
	const firstVariant = product.variants?.[0]
	const price =
		firstVariant?.prices?.[0]?.amount ||
		firstVariant?.original_price ||
		firstVariant?.original_price_calculated ||
		0
	const currencyCode =
		firstVariant?.prices?.[0]?.currency_code ||
		product.currency_code ||
		"USD"

	// Extract categories as string array
	const categories = product.categories?.map((c) => c.name) || []

	// Extract tags as string array
	const tags = product.tags?.map((t) => t.value) || []

	// Extract images as string array
	const images = product.images?.map((img) => img.url) || []

	// Extract collection ID for faceting (Medusa v2 uses collection_id, not collections)
	const collectionIds = product.collection_id ? [product.collection_id] : []

	// Extract type IDs for faceting
	const typeIds = product.type_id ? [product.type_id] : []

	// Extract material IDs for faceting (if applicable)
	const materialIds = product.material_id ? [product.material_id] : []

	// Build variants array with minimal data
	const variants = (product.variants || []).map((v) => ({
		id: v.id,
		title: v.title || v.options?.map((o) => o.value).join(" / ") || "",
		options:
			v.options?.reduce((acc: Record<string, string>, o) => {
				// Use first non-undefined option title as key
				const key = o.option_title || o.title
				if (key) {
					acc[key] = o.value
				}
				return acc
			}, {}) || {},
		prices: v.prices || [],
	}))

	// Extract Strapi enriched content
	const richDescription = strapiContent?.rich_description || ""
	const features = strapiContent?.features || []
	const specifications = strapiContent?.specifications || {}
	const seoTitle = strapiContent?.seo_title || product.title
	const seoDescription = strapiContent?.seo_description || product.description || ""
	const metaKeywords = strapiContent?.meta_keywords || []

	return {
		// Core Medusa fields
		id: product.id,
		title: product.title,
		handle: product.handle,
		subtitle: product.subtitle || undefined,
		description: product.description || undefined,
		thumbnail: product.thumbnail || undefined,
		status: product.status,

		// Pricing
		price,
		currency_code: currencyCode,

		// Variants
		variants,

		// Categories for faceting
		categories,

		// Tags
		tags,

		// Images
		images,

		// Collection IDs for faceting
		collection_ids: collectionIds,

		// Type IDs for faceting
		type_ids: typeIds,

		// Material IDs for faceting
		material_ids: materialIds,

		// Enriched from Strapi
		rich_description: richDescription || undefined,
		features: features.length > 0 ? features : undefined,
		specifications: Object.keys(specifications).length > 0 ? (specifications as Record<string, string>) : undefined,
		seo_title: seoTitle || undefined,
		seo_description: seoDescription || undefined,
		meta_keywords: metaKeywords.length > 0 ? metaKeywords : undefined,

		// Metadata
		created_at: product.created_at,
		updated_at: product.updated_at,
	}
}
```

**Step 2: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/transformers/product.ts
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/transformers/product.ts
git commit -m "refactor(meilisearch): extract product transformer to dedicated file"
```

---

## Task 9: Create transformers/category.ts

**Files:**
- Create: `apps/backend/src/modules/meilisearch/transformers/category.ts`

**Step 1: Create category transformer file**

```typescript
import type { MeilisearchCategoryDocument } from "@3dbyte-tech-store/shared-types"
import type { SyncCategoriesStepCategory } from "../types"

/**
 * Compute the full hierarchy path for a category
 * Traverses parent relationships to build the path array
 *
 * @param category - Category with optional parent_category
 * @returns Path array from root to current category
 *
 * @example
 * ```ts
 * computeCategoryPath({ name: "Shoes", parent_category: { name: "Men", parent_category: null } })
 * // Returns: ["Men", "Shoes"]
 * ```
 */
export function computeCategoryPath(
	category: SyncCategoriesStepCategory | null
): string[] {
	if (!category) return []

	const path: string[] = []
	let current: SyncCategoriesStepCategory | null | undefined = category

	// Traverse up the hierarchy
	while (current) {
		path.unshift(current.name)
		current = current.parent_category
	}

	return path
}

/**
 * Compute the breadcrumb string for a category's parent
 * Returns the full path from root to parent: "Apparel > Men > Clothing"
 * Returns null for root categories (no parent)
 *
 * @param category - Category with optional parent_category
 * @returns Breadcrumb string of parent's full path or null
 *
 * @example
 * ```ts
 * computeParentName({ name: "Shoes", parent_category: { name: "Clothing", parent_category: { name: "Men", parent_category: { name: "Apparel", parent_category: null } } } })
 * // Returns: "Apparel > Men > Clothing"
 *
 * computeParentName({ name: "Men", parent_category: { name: "Apparel", parent_category: null } })
 * // Returns: "Apparel"
 *
 * computeParentName({ name: "Apparel", parent_category: null })
 * // Returns: null
 * ```
 */
export function computeParentName(
	category: SyncCategoriesStepCategory | null
): string | null {
	if (!category?.parent_category) return null

	const parentPath = computeCategoryPath(category.parent_category)
	const breadcrumb = parentPath.join(" > ")

	return breadcrumb
}

/**
 * Transform Medusa category into a Meilisearch document
 *
 * This function transforms a category from Medusa into a Meilisearch document
 * with computed breadcrumb hierarchy and category IDs for search and browse functionality.
 *
 * @param category - Category from Medusa with parent relationships
 * @param productCount - Number of active products in this category
 * @returns Formatted Meilisearch category document
 */
export function toCategoryDocument(
	category: SyncCategoriesStepCategory,
	productCount: number,
	breadcrumb?: Array<{ id: string; name: string; handle: string }>,
	category_ids?: string[],
): MeilisearchCategoryDocument {
	// Convert created_at to UNIX timestamp in milliseconds
	// Handles Date, string, or number (already a timestamp)
	let createdAt: number
	if (category.created_at instanceof Date) {
		createdAt = category.created_at.getTime()
	} else if (typeof category.created_at === "string") {
		createdAt = new Date(category.created_at).getTime()
	} else if (typeof category.created_at === "number") {
		createdAt = category.created_at
	} else {
		createdAt = Date.now()
	}

	// Generate display_path from breadcrumb (full path of parents)
	const display_path =
		breadcrumb && breadcrumb.length > 0
			? breadcrumb.map((b) => b.name).join(" > ")
			: undefined

	// Use provided breadcrumb and category_ids, or fall back to empty/single
	const finalBreadcrumb = breadcrumb || []
	const finalCategoryIds = category_ids || [category.id]

	return {
		id: category.id,
		name: category.name,
		handle: category.handle,
		description: category.description || undefined,
		parent_category_id: category.parent_category_id || undefined,
		display_path,
		rank: category.rank,
		breadcrumb: finalBreadcrumb,
		category_ids: finalCategoryIds,
		product_count: productCount,
		created_at: createdAt,
	}
}
```

**Step 2: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/transformers/category.ts
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/transformers/category.ts
git commit -m "refactor(meilisearch): extract category transformer to dedicated file"
```

---

## Task 10: Create transformers/brand.ts

**Files:**
- Create: `apps/backend/src/modules/meilisearch/transformers/brand.ts`

**Step 1: Create brand transformer file**

```typescript
import type {
	MeilisearchBrandDocument,
	SyncBrandsStepBrand,
	StrapiBrandDescription,
} from "@3dbyte-tech-store/shared-types"

/**
 * Transform Medusa brand and Strapi content into a Meilisearch document
 *
 * @param brand - Medusa brand data
 * @param strapiContent - Enriched content from Strapi (can be null)
 * @param productCount - Number of products for this brand
 * @returns Formatted Meilisearch brand document
 */
export function toBrandDocument(
	brand: SyncBrandsStepBrand,
	strapiContent: StrapiBrandDescription | null,
	productCount: number
): MeilisearchBrandDocument {
	const createdAt = new Date(brand.created_at).getTime()
	const logos = strapiContent?.brand_logo?.map((media) => media.url) ?? []
	const keywords = strapiContent?.meta_keywords ?? []

	return {
		id: brand.id,
		name: brand.name,
		handle: brand.handle,
		rich_description: strapiContent?.rich_description,
		brand_logo: logos.length > 0 ? logos : undefined,
		meta_keywords: keywords.length > 0 ? keywords : undefined,
		product_count: productCount,
		created_at: createdAt,
	}
}
```

**Step 2: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/transformers/brand.ts
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/transformers/brand.ts
git commit -m "refactor(meilisearch): extract brand transformer to dedicated file"
```

---

## Task 11: Create transformers/index.ts

**Files:**
- Create: `apps/backend/src/modules/meilisearch/transformers/index.ts`

**Step 1: Create transformers barrel export**

```typescript
// Product transformers
export { toMeilisearchDocument } from "./product"

// Category transformers
export { toCategoryDocument, computeCategoryPath, computeParentName } from "./category"

// Brand transformers
export { toBrandDocument } from "./brand"

// Re-export types for convenience
export type { SyncCategoriesStepCategory } from "../types"
```

**Step 2: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/transformers/index.ts
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/transformers/index.ts
git commit -m "refactor(meilisearch): create transformers barrel export"
```

---

## Task 12: Create service/meilisearch-service.ts

**Files:**
- Create: `apps/backend/src/modules/meilisearch/service/meilisearch-service.ts`

**Step 1: Create service file**

Move the service class from `service.ts` to `service/meilisearch-service.ts`, keeping the same content but removing the index settings exports at the bottom (lines 282-412 in original).

**Step 2: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/service/meilisearch-service.ts
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/service/meilisearch-service.ts
git commit -m "refactor(meilisearch): move service class to service folder"
```

---

## Task 13: Update service/index.ts

**Files:**
- Modify: `apps/backend/src/modules/meilisearch/service.ts` → `apps/backend/src/modules/meilisearch/service/index.ts`

**Step 1: Replace service.ts with service/index.ts**

Delete `service.ts` and create `service/index.ts`:

```typescript
export { default as MeilisearchModuleService } from "./meilisearch-service"
export type { MeilisearchOptions } from "./meilisearch-service"
```

**Step 2: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/service/index.ts
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/service/
git rm apps/backend/src/modules/meilisearch/service.ts
git commit -m "refactor(meilisearch): convert service.ts to service folder with barrel export"
```

---

## Task 14: Update loaders to use new service path

**Files:**
- Modify: `apps/backend/src/modules/meilisearch/loaders/configure-category-index.ts`
- Modify: `apps/backend/src/modules/meilisearch/loaders/configure-brand-index.ts`

**Step 1: Update configure-category-index.ts imports**

Change:
```typescript
import { CATEGORY_INDEX_SETTINGS, type MeilisearchOptions } from "../service"
import MeilisearchModuleService from "../service"
```

To:
```typescript
import { CATEGORY_INDEX_SETTINGS } from "../settings"
import type { MeilisearchOptions } from "../service"
import { MeilisearchModuleService } from "../service"
```

**Step 2: Update configure-brand-index.ts imports**

Change:
```typescript
import { BRAND_INDEX_SETTINGS, type MeilisearchOptions } from "../service"
import MeilisearchModuleService from "../service"
```

To:
```typescript
import { BRAND_INDEX_SETTINGS } from "../settings"
import type { MeilisearchOptions } from "../service"
import { MeilisearchModuleService } from "../service"
```

**Step 3: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/loaders/
```

Expected: No type errors

**Step 4: Commit**

```bash
git add apps/backend/src/modules/meilisearch/loaders/
git commit -m "refactor(meilisearch): update loaders to use new folder structure"
```

---

## Task 15: Update module index.ts

**Files:**
- Modify: `apps/backend/src/modules/meilisearch/index.ts`

**Step 1: Update imports in index.ts**

Change:
```typescript
import MeilisearchModuleService from "./service"
```

To:
```typescript
import { MeilisearchModuleService } from "./service"
```

**Step 2: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit --skipLibCheck src/modules/meilisearch/index.ts
```

Expected: No type errors

**Step 3: Commit**

```bash
git add apps/backend/src/modules/meilisearch/index.ts
git commit -m "refactor(meilisearch): update module index to use new service path"
```

---

## Task 16: Update all files that import from utils to use transformers

**Files:**
- Search and update all files importing from `../modules/meilisearch/utils` or `../modules/meilisearch/utils/*`

**Step 1: Find all imports from utils**

```bash
cd apps/backend && grep -r "from.*meilisearch.*utils" src/ --include="*.ts"
```

**Step 2: For each file found, update imports**

Change:
- `from "../modules/meilisearch/utils"` → `from "../modules/meilisearch/transformers"`
- `from "../modules/meilisearch/utils/product"` → `from "../modules/meilisearch/transformers/product"`
- etc.

**Step 3: Remove SyncCategoriesStepCategory import if used**

If any file imports `SyncCategoriesStepCategory` from utils, change to:
```typescript
import type { SyncCategoriesStepCategory } from "../modules/meilisearch/types"
```

**Step 4: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: No type errors

**Step 5: Commit**

```bash
git add apps/backend/src/
git commit -m "refactor(meilisearch): update all imports to use transformers folder"
```

---

## Task 17: Delete old utils folder

**Files:**
- Delete: `apps/backend/src/modules/meilisearch/utils.ts`
- Delete: `apps/backend/src/modules/meilisearch/utils/` directory

**Step 1: Verify no more imports from utils**

```bash
cd apps/backend && grep -r "from.*meilisearch.*utils" src/ --include="*.ts"
```

Expected: No results

**Step 2: Delete utils files**

```bash
rm apps/backend/src/modules/meilisearch/utils.ts
rm -rf apps/backend/src/modules/meilisearch/utils/
```

**Step 3: Run TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: No type errors

**Step 4: Commit**

```bash
git add apps/backend/src/modules/meilisearch/
git commit -m "refactor(meilisearch): remove old utils folder"
```

---

## Task 18: Remove backend-only types from shared-types

**Files:**
- Modify: `packages/shared-types/src/meilisearch.ts`

**Step 1: Remove backend-only exports**

Remove these from `packages/shared-types/src/meilisearch.ts`:
- `MeilisearchModuleConfig` interface
- `MeilisearchIndexSettings` interface
- `BRAND_INDEX_SETTINGS` constant (lines 44-52)
- `SyncProductsStepProduct` interface
- `StrapiProductDescription` interface
- `SyncBrandsStepBrand` interface
- `StrapiBrandDescription` interface

**Step 2: Update shared-types index.ts if needed**

Check `packages/shared-types/src/index.ts` and remove any re-exports of the deleted types.

**Step 3: Run TypeScript check**

```bash
cd packages/shared-types && npx tsc --noEmit
```

Expected: No type errors

**Step 4: Run backend TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: No type errors (backend should not be using these removed types)

**Step 5: Commit**

```bash
git add packages/shared-types/src/
git commit -m "refactor(shared-types): remove backend-only types from meilisearch"
```

---

## Task 19: Run full build and tests

**Files:**
- All

**Step 1: Build all packages**

```bash
pnpm run build:turbo
```

Expected: All packages build successfully

**Step 2: Run backend tests**

```bash
pnpm --filter=@3dbyte-tech-store/backend test
```

Expected: All tests pass

**Step 3: Run shared-types tests**

```bash
pnpm --filter=@3dbyte-tech-store/shared-types test
```

Expected: All tests pass

**Step 4: Final commit if needed**

If any minor fixes needed:

```bash
git add .
git commit -m "fix: resolve build/test issues from reorganization"
```

---

## Task 20: Update documentation

**Files:**
- Modify: `apps/backend/CLAUDE.md`

**Step 1: Update CLAUDE.md with new structure**

Add/update the meilisearch module structure documentation:

```markdown
### Meilisearch Module Structure

```
modules/meilisearch/
├── index.ts                    # Module definition
├── service/                    # Service layer
│   ├── index.ts               # Service exports
│   └── meilisearch-service.ts # Core service class
├── transformers/              # Data transformation utilities
│   ├── index.ts
│   ├── product.ts            # toMeilisearchDocument
│   ├── category.ts           # toCategoryDocument + helpers
│   └── brand.ts              # toBrandDocument
├── settings/                  # Index configuration
│   ├── index.ts
│   ├── product.ts            # PRODUCT_INDEX_SETTINGS
│   ├── category.ts           # CATEGORY_INDEX_SETTINGS
│   └── brand.ts              # BRAND_INDEX_SETTINGS
├── loaders/                   # Module loaders
│   ├── configure-product-index.ts
│   ├── configure-category-index.ts
│   └── configure-brand-index.ts
└── types/                     # Module-specific types
    ├── index.ts
    └── sync.types.ts         # SyncCategoriesStepCategory
```
```

**Step 2: Commit**

```bash
git add apps/backend/CLAUDE.md
git commit -m "docs(backend): update meilisearch module structure documentation"
```

---

## Summary

After completing all tasks:

**New Structure:**
- `service/` - Service class with barrel export
- `transformers/` - Data transformation functions (product, category, brand)
- `settings/` - Index settings (product, category, brand)
- `types/` - Module-specific types
- `loaders/` - Existing loaders (unchanged)

**Cleanup:**
- Removed old `utils.ts` and `utils/` folder
- Removed backend-only types from `shared-types`

**File Size Improvements:**
- `service.ts` was 412 lines → now split across multiple files
- Better separation of concerns
- Easier to find and modify settings
