import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { deleteBrandsFromMeilisearchStep } from "./steps/delete-brands-from-meilisearch"

export type DeleteBrandsFromMeilisearchWorkflowInput = {
	ids: string[]
}

export const deleteBrandsFromMeilisearchWorkflow = createWorkflow(
	"delete-brands-from-meilisearch",
	(input: DeleteBrandsFromMeilisearchWorkflowInput) => {
		deleteBrandsFromMeilisearchStep(input)

		return new WorkflowResponse({ deleted: input.ids.length })
	}
)
