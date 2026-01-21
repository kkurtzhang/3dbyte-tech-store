import {
	createWorkflow,
	WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { indexBrandStep } from "./steps/index-brand-step"
import type {
	SyncBrandsStepBrand,
	StrapiBrandDescription,
} from "@3dbyte-tech-store/shared-types"

export type IndexRichBrandWorkflowInput = {
	brand: SyncBrandsStepBrand
	strapiPayload: StrapiBrandDescription
	productCount: number
}

/**
 * Workflow C: Index Rich Brand to Meilisearch
 *
 * This workflow indexes fully enriched brand data to Meilisearch.
 * It's triggered by Strapi webhooks (entry.publish).
 *
 * The workflow includes:
 * - Basic Medusa data (id, name, handle)
 * - Strapi enrichment (logo, description, meta_keywords)
 * - Product count from Medusa
 *
 * Retry config: { maxRetries: 5, retryInterval: 2 }
 */
export const indexRichBrandWorkflow = createWorkflow(
	"index-rich-brand-workflow",
	({ brand, strapiPayload, productCount }: IndexRichBrandWorkflowInput) => {
		// Index rich brand data to Meilisearch with Strapi enrichment
		const indexResult = indexBrandStep({
			brand,
			strapiPayload,
			productCount,
		})

		return new WorkflowResponse({
			indexed: indexResult.indexed,
			brandId: indexResult.brandId,
		})
	}
)
