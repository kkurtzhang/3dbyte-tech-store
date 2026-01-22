import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../../../../modules/meilisearch"
import { toBrandDocument } from "../../../../modules/meilisearch/utils"
import type MeilisearchModuleService from "../../../../modules/meilisearch/service"
import type {
	SyncBrandsStepBrand,
	StrapiBrandDescription,
	MeilisearchBrandDocument,
} from "@3dbyte-tech-store/shared-types"

export type SyncBrandsStepInput = {
	brands: SyncBrandsStepBrand[]
	strapiContents?: StrapiBrandDescription[]
	/** Product counts per brand ID, computed at workflow level using useQueryGraphStep */
	productCounts?: Record<string, number>
}

type SyncBrandsStepCompensationData = {
	newBrandIds: string[]
	existingBrands: Record<string, unknown>[]
}

export const syncBrandsStep = createStep(
	"sync-brands",
	async (
		{ brands, strapiContents = [], productCounts = {} }: SyncBrandsStepInput,
		{ container }
	) => {
		const meilisearchModuleService =
			container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)
		const logger = container.resolve("logger")

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

		// Log product counts for debugging
		logger.info(
			`Received product counts for ${Object.keys(productCounts).length} brands`
		)

		// Transform brands to Meilisearch documents with Strapi enrichment
		const documents: MeilisearchBrandDocument[] = brands.map((brand) => {
			const strapiContent = strapiContentMap.get(brand.id)
			const productCount = productCounts[brand.id] ?? 0
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
