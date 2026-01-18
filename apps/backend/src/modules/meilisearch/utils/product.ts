import type {
	MeilisearchCategoryDocument,
	MeilisearchIndexSettings,
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
	const detailedDescription = strapiContent?.detailed_description || ""
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
		detailed_description: detailedDescription || undefined,
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

