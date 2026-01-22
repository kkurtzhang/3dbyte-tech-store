import {
	createWorkflow,
	WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteCategoriesFromMeilisearchStep } from "./steps/delete-categories-from-meilisearch"

/**
 * Input type for delete-categories-from-meilisearch workflow
 */
export type DeleteCategoriesFromMeilisearchWorkflowInput = {
	ids: string[]
}

/**
 * Output type for delete-categories-from-meilisearch workflow
 */
export type DeleteCategoriesFromMeilisearchWorkflowOutput = {
	deleted: number
}

/**
 * Delete categories from Meilisearch workflow
 *
 * This workflow removes deleted categories from the Meilisearch index.
 * It wraps the deleteCategoriesFromMeilisearchStep to provide proper
 * workflow context and container access.
 *
 * Use case: When categories are deleted from Medusa, they must be removed
 * from the search index. Since the category no longer exists in the database,
 * we cannot use syncCategoriesWorkflow.
 *
 * @param ids - Array of category IDs to delete from Meilisearch
 * @returns Statistics about the deletion operation
 *
 * @example
 * ```typescript
 * const result = await deleteCategoriesFromMeilisearchWorkflow(container).run({
 *   input: { ids: ["pcat_123"] }
 * })
 * // Returns: { deleted: 1 }
 * ```
 */
export const deleteCategoriesFromMeilisearchWorkflow = createWorkflow(
	"delete-categories-from-meilisearch",
	(input: DeleteCategoriesFromMeilisearchWorkflowInput) => {
		deleteCategoriesFromMeilisearchStep(input)

		return new WorkflowResponse({
			deleted: input.ids.length,
		})
	}
)
