import type {
	MeilisearchBrandDocument,
	SyncBrandsStepBrand,
	StrapiBrandDescription,
} from "@3dbyte-tech-store/shared-types"

/**
 * Transform Medusa brand and Strapi content into a Meilisearch document
 *
 * @param brand - Medusa brand data
 * @param strapiContent - Enriched content from Strapi (optional)
 * @param productCount - Number of products for this brand
 * @returns Formatted Meilisearch brand document
 */
export function toBrandDocument(
	brand: SyncBrandsStepBrand,
	productCount: number,
	strapiContent?: StrapiBrandDescription | null
): MeilisearchBrandDocument {
	const createdAt = new Date(brand.created_at).getTime()
	const logos = strapiContent?.brand_logo?.map((media) => media.url) ?? []
	const keywords = strapiContent?.meta_keywords ?? []

	return {
		id: brand.id,
		name: brand.name,
		handle: brand.handle,
		detailed_description: strapiContent?.detailed_description,
		brand_logo: logos.length > 0 ? logos : undefined,
		meta_keywords: keywords.length > 0 ? keywords : undefined,
		product_count: productCount,
		created_at: createdAt,
	}
}

/**
 * Calculate product count for a brand by querying product-brand links
 * This will be implemented in the workflow step, placeholder for now
 *
 * TODO: Implement product count calculation in workflow step
 */
export function calculateProductCount(/* TODO: implement */): number {
	return 0
}
