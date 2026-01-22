import {
	createWorkflow,
	WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { indexBrandStep } from "./steps/index-brand-step"
import type { SyncBrandsStepBrand } from "@3dbyte-tech-store/shared-types"

export type IndexBasicBrandWorkflowInput = {
	brand: SyncBrandsStepBrand
}

/**
 * Workflow A: Index Basic Brand to Meilisearch
 *
 * This workflow indexes only basic brand data (id, name, handle) for immediate searchability.
 * It's triggered on brand.created and brand.updated events.
 *
 * The step uses retry configuration: { maxRetries: 3, retryInterval: 2 }
 * This is configured at the step level when invoking.
 */
export const indexBasicBrandWorkflow = createWorkflow(
	"index-basic-brand-workflow",
	({ brand }: IndexBasicBrandWorkflowInput) => {
		// Index basic brand data to Meilisearch (without Strapi enrichment)
		// Product count defaults to 0 for new/updated brands
		const indexResult = indexBrandStep({
			brand,
			strapiPayload: null,
			productCount: 0,
		})

		return new WorkflowResponse({
			indexed: indexResult.indexed,
			brandId: indexResult.brandId,
		})
	}
)
