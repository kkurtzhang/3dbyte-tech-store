import {
	createWorkflow,
	WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { pushBrandToStrapiStep } from "./steps/push-brand-to-strapi-step"
import type { SyncBrandsStepBrand } from "@3dbyte-tech-store/shared-types"

export type SyncBrandToStrapiWorkflowInput = {
	brand: SyncBrandsStepBrand
}

/**
 * Workflow B: Sync Brand to Strapi
 *
 * This workflow pushes brand data to Strapi CMS for content enrichment.
 * It's triggered on brand.created and brand.updated events (in parallel with Workflow A).
 *
 * The step uses high retry tolerance: { maxRetries: 10, retryInterval: 60 }
 * This ensures resilience against Strapi downtime.
 */
export const syncBrandToStrapiWorkflow = createWorkflow(
	"sync-brand-to-strapi-workflow",
	({ brand }: SyncBrandToStrapiWorkflowInput) => {
		// Push brand data to Strapi
		const syncResult = pushBrandToStrapiStep({
			brand,
		})

		return new WorkflowResponse({
			synced: syncResult.synced,
			brandId: syncResult.brandId,
			strapiDocumentId: syncResult.strapiDocumentId,
		})
	}
)
