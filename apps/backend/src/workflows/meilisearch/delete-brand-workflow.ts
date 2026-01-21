import {
	createWorkflow,
	WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteBrandsFromMeilisearchStep } from "./steps/delete-brands-from-meilisearch"
import { deleteFromStrapiStep } from "./steps/delete-from-strapi-step"

export type DeleteBrandWorkflowInput = {
	brandId: string
}

/**
 * Workflow D: Delete Brand from Meilisearch and Strapi
 *
 * This workflow removes brand data from both Meilisearch and Strapi.
 * It's triggered on brand.deleted events.
 *
 * Steps:
 * 1. Delete from Meilisearch (immediate)
 * 2. Delete from Strapi (background, with retry)
 *
 * Retry configs:
 * - Meilisearch deletion: { maxRetries: 3, retryInterval: 2 }
 * - Strapi deletion: { maxRetries: 3, retryInterval: 10 }
 */
export const deleteBrandWorkflow = createWorkflow(
	"delete-brand-workflow",
	({ brandId }: DeleteBrandWorkflowInput) => {
		// Step 1: Delete from Meilisearch (immediate)
		deleteBrandsFromMeilisearchStep({
			ids: [brandId],
		})

		// Step 2: Delete from Strapi (can be async/background)
		deleteFromStrapiStep({
			brandId,
		})

		return new WorkflowResponse({
			deleted: true,
			brandId,
		})
	}
)
