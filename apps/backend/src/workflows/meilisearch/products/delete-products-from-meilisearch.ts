import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { deleteProductsFromMeilisearchStep } from "./steps/delete-products-from-meilisearch"

export type DeleteProductsFromMeilisearchWorkflowInput = {
	ids: string[]
}

export const deleteProductsFromMeilisearchWorkflow = createWorkflow(
	"delete-products-from-meilisearch",
	(input: DeleteProductsFromMeilisearchWorkflowInput) => {
		deleteProductsFromMeilisearchStep(input)

		return new WorkflowResponse({ deleted: input.ids.length })
	}
)
