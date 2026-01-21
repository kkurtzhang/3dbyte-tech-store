import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../../../modules/meilisearch"
import type MeilisearchModuleService from "../../../modules/meilisearch/service"

export type DeleteCategoriesFromMeilisearchStepInput = {
	ids: string[]
}

/**
 * Delete categories from Meilisearch index step
 *
 * This step removes inactive or deleted categories from the Meilisearch index.
 * It includes a compensation function to restore deleted categories during workflow rollback.
 *
 * @param ids - Array of category IDs to delete from Meilisearch
 * @returns StepResponse with existing records for compensation
 */
export const deleteCategoriesFromMeilisearchStep = createStep(
	"delete-categories-from-meilisearch-step",
	async (
		{ ids }: DeleteCategoriesFromMeilisearchStepInput,
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
			"category"
		)

		// Delete from Meilisearch
		await meilisearchModuleService.deleteFromIndex(ids, "category")

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

		await meilisearchModuleService.indexData(existingRecords, "category")
	}
)
