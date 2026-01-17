import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../../../modules/meilisearch"
import type MeilisearchModuleService from "../../../modules/meilisearch/service"

export type DeleteProductsFromMeilisearchStepInput = {
	ids: string[]
}

export const deleteProductsFromMeilisearchStep = createStep(
	"delete-products-from-meilisearch-step",
	async (
		{ ids }: DeleteProductsFromMeilisearchStepInput,
		{ container }
	) => {
		const meilisearchModuleService =
			container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

		if (!ids || ids.length === 0) {
			return new StepResponse(undefined, [])
		}

		// Retrieve existing records BEFORE deletion (for rollback)
		const existingRecords = await meilisearchModuleService.retrieveFromIndex(
			ids,
			"product"
		)

		// Delete from Meilisearch
		await meilisearchModuleService.deleteFromIndex(ids, "product")

		return new StepResponse(undefined, existingRecords)
	},
	// Compensation: re-index if rollback needed
	async (existingRecords, { container }) => {
		if (
			!existingRecords ||
			!Array.isArray(existingRecords) ||
			existingRecords.length === 0
		) {
			return
		}

		const meilisearchModuleService =
			container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

		await meilisearchModuleService.indexData(existingRecords, "product")
	}
)
