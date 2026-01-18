import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../../../modules/meilisearch"
import { toBrandDocument } from "../../../modules/meilisearch/utils"
import type MeilisearchModuleService from "../../../modules/meilisearch/service"
import type {
	SyncBrandsStepBrand,
	StrapiBrandDescription,
	MeilisearchBrandDocument,
} from "@3dbyte-tech-store/shared-types"
import { BRAND_MODULE } from "../../../modules/brand"

export type SyncBrandsStepInput = {
	brands: SyncBrandsStepBrand[]
	strapiContents?: StrapiBrandDescription[]
}

type SyncBrandsStepCompensationData = {
	newBrandIds: string[]
	existingBrands: Record<string, unknown>[]
}

/**
 * Query product counts for multiple brands using Medusa link system
 */
async function getProductCountsForBrands(
	brandIds: string[],
	container: any
): Promise<Map<string, number>> {
	const productCounts = new Map<string, number>()

	// Use the link service to query product-brand relationships
	const link = container.resolve("link")
	const logger = container.resolve("logger")

	try {
		// Query links for all brands at once
		// This returns all links between products and brands
		const links = await link.list({
			[BRAND_MODULE]: {
				brand_id: brandIds,
			},
		})

		// Count products per brand
		for (const brandId of brandIds) {
			const count = links.filter(
				(link: any) => link[BRAND_MODULE]?.brand_id === brandId
			).length
			productCounts.set(brandId, count)
		}

		logger.info(
			`Calculated product counts for ${brandIds.length} brands: ${JSON.stringify(Array.from(productCounts.entries()))}`
		)
	} catch (error) {
		// If link query fails, default to 0 for all brands
		const message = error instanceof Error ? error.message : "Unknown error"
		logger.warn(
			`Failed to query product counts for brands: ${message}, defaulting to 0`
		)
		for (const brandId of brandIds) {
			productCounts.set(brandId, 0)
		}
	}

	return productCounts
}

export const syncBrandsStep = createStep(
	"sync-brands",
	async (
		{ brands, strapiContents = [] }: SyncBrandsStepInput,
		{ container }
	) => {
		const meilisearchModuleService =
			container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

		if (!brands || brands.length === 0) {
			return new StepResponse(
				{ indexed: 0 },
				{ newBrandIds: [], existingBrands: [] }
			)
		}

		// Retrieve existing brands BEFORE indexing (for rollback)
		const existingBrands = await meilisearchModuleService.retrieveFromIndex(
			brands.map((brand) => brand.id),
			"brand"
		)

		// Determine which brands are new vs existing
		const existingIds = new Set(existingBrands.map((b) => b.id as string))
		const newBrandIds = brands
			.filter((brand) => !existingIds.has(brand.id))
			.map((brand) => brand.id)

		// Create a map of Strapi content by medusa_brand_id for quick lookup
		const strapiContentMap = new Map<string, StrapiBrandDescription>(
			strapiContents.map((content) => [content.medusa_brand_id, content])
		)

		// Calculate product counts for all brands
		const productCounts = await getProductCountsForBrands(
			brands.map((b) => b.id),
			container
		)

		// Transform brands to Meilisearch documents with Strapi enrichment
		const documents: MeilisearchBrandDocument[] = brands.map((brand) => {
			const strapiContent = strapiContentMap.get(brand.id)
			const productCount = productCounts.get(brand.id) ?? 0
			return toBrandDocument(brand, strapiContent ?? null, productCount)
		})

		// Index the documents
		await meilisearchModuleService.indexData(
			documents as unknown as Record<string, unknown>[],
			"brand"
		)

		return new StepResponse(
			{ indexed: documents.length },
			{ newBrandIds, existingBrands }
		)
	},
	// Compensation function for rollback
	async (compensationData, { container }) => {
		if (!compensationData) {
			return
		}

		const { newBrandIds, existingBrands } =
			compensationData as SyncBrandsStepCompensationData

		const meilisearchModuleService =
			container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

		// Delete newly added brands
		if (newBrandIds && newBrandIds.length > 0) {
			await meilisearchModuleService.deleteFromIndex(newBrandIds, "brand")
		}

		// Restore existing brands to their original state
		if (existingBrands && existingBrands.length > 0) {
			await meilisearchModuleService.indexData(existingBrands, "brand")
		}
	}
)
