import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../../../../modules/meilisearch"
import type MeilisearchModuleService from "../../../../modules/meilisearch/service"

export type DeleteBrandsFromMeilisearchStepInput = {
	ids: string[]
}

export const deleteBrandsFromMeilisearchStep = createStep(
	"delete-brands-from-meilisearch-step",
	async (
		{ ids }: DeleteBrandsFromMeilisearchStepInput,
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
			"brand"
		)

		// Delete from Meilisearch
		await meilisearchModuleService.deleteFromIndex(ids, "brand")

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

		await meilisearchModuleService.indexData(existingRecords, "brand")
	}
)
