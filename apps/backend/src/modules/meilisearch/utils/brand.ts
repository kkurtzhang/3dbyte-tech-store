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
