import type {
	MeilisearchProductDocument,
	StrapiProductDescription,
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
	product: any,
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
	const categories = product.categories?.map((c: any) => c.name) || []

	// Extract tags as string array
	const tags = product.tags?.map((t: any) => t.value) || []

	// Extract images as string array
	const images = product.images?.map((img: any) => img.url) || []

	// Extract collection ID for faceting (Medusa v2 uses collection_id, not collections)
	const collectionIds = product.collection_id ? [product.collection_id] : []

	// Extract type IDs for faceting
	const typeIds = product.type_id
		? [product.type_id]
		: (product.types?.map((t: any) => t.id) || [])

	// Extract material IDs for faceting (if applicable)
	const materialIds = product.material_id
		? [product.material_id]
		: (product.materials?.map((m: any) => m.id) || [])

	// Build variants array with minimal data
	const variants = (product.variants || []).map((v: any) => ({
		id: v.id,
		title: v.title || v.options?.map((o: any) => o.value).join(" / ") || "",
		options: v.options?.reduce((acc: Record<string, string>, o: any) => {
			acc[o.option_title || o.title] = o.value
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
		specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
		seo_title: seoTitle || undefined,
		seo_description: seoDescription || undefined,
		meta_keywords: metaKeywords.length > 0 ? metaKeywords : undefined,

		// Metadata
		created_at: product.created_at,
		updated_at: product.updated_at,
	}
}

/**
 * Default index settings for Meilisearch product index
 */
export const DEFAULT_INDEX_SETTINGS = {
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
		"detailed_description",
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
		"detailed_description",
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
