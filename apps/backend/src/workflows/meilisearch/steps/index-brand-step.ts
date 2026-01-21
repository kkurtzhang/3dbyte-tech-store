import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../../../modules/meilisearch"
import { toBrandDocument } from "../../../modules/meilisearch/utils"
import type MeilisearchModuleService from "../../../modules/meilisearch/service"
import type {
	SyncBrandsStepBrand,
	StrapiBrandDescription,
	MeilisearchBrandDocument,
} from "@3dbyte-tech-store/shared-types"

export type IndexBrandStepInput = {
	brand: SyncBrandsStepBrand
	strapiPayload?: StrapiBrandDescription | null
	productCount?: number
}

type IndexBrandStepCompensationData = {
	brandId: string
	previousDocument: Record<string, unknown> | null
}

/**
 * Step to index a single brand to Meilisearch.
 * Supports both basic indexing (Medusa data only) and rich indexing (with Strapi enrichment).
 *
 * This step is designed to be used in workflows with configurable retry strategies:
 * - Basic indexing: { maxRetries: 3, retryInterval: 2 }
 * - Rich indexing: { maxRetries: 5, retryInterval: 2 }
 */
export const indexBrandStep = createStep(
	"index-brand-step",
	async (
		{ brand, strapiPayload, productCount = 0 }: IndexBrandStepInput,
		{ container }
	) => {
		const meilisearchModuleService =
			container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

		// Retrieve existing document BEFORE indexing (for rollback)
		const existingDocs = await meilisearchModuleService.retrieveFromIndex(
			[brand.id],
			"brand"
		)
		const previousDocument = existingDocs.length > 0 ? existingDocs[0] : null

		// Transform brand to Meilisearch document
		const document: MeilisearchBrandDocument = toBrandDocument(
			brand,
			strapiPayload ?? null,
			productCount
		)

		// Index the document
		await meilisearchModuleService.indexData(
			[document as unknown as Record<string, unknown>],
			"brand"
		)

		return new StepResponse(
			{ indexed: true, brandId: brand.id },
			{ brandId: brand.id, previousDocument }
		)
	},
	// Compensation function for rollback
	async (compensationData, { container }) => {
		if (!compensationData) {
			return
		}

		const { brandId, previousDocument } =
			compensationData as IndexBrandStepCompensationData

		const meilisearchModuleService =
			container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

		if (previousDocument) {
			// Restore the previous document
			await meilisearchModuleService.indexData([previousDocument], "brand")
		} else {
			// This was a new brand, delete it
			await meilisearchModuleService.deleteFromIndex([brandId], "brand")
		}
	}
)
