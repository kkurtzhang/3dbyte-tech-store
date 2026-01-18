import {
	createWorkflow,
	transform,
	WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { syncBrandsStep } from "./steps/sync-brands"
import { fetchStrapiBrandContentStep } from "./steps/fetch-strapi-brand-content"
import type { SyncBrandsStepBrand } from "@3dbyte-tech-store/shared-types"

export type SyncBrandsWorkflowInput = {
	filters?: Record<string, unknown>
	limit?: number
	offset?: number
}

export const syncBrandsWorkflow = createWorkflow(
	"sync-brands",
	({ filters, limit, offset }: SyncBrandsWorkflowInput) => {
		// Step 1: Fetch brands from Medusa using useQueryGraphStep
		const { data: brands, metadata } = useQueryGraphStep({
			entity: "brand",
			fields: ["id", "name", "handle", "created_at"],
			pagination: {
				take: limit,
				skip: offset,
			},
			filters,
		})

		// Step 2: Fetch Strapi content for enrichment
		const strapiContents = fetchStrapiBrandContentStep({
			brands: brands as SyncBrandsStepBrand[],
		})

		// Step 3: Sync brands to Meilisearch with Strapi enrichment
		const syncResult = syncBrandsStep({
			brands: brands as SyncBrandsStepBrand[],
			strapiContents,
		})

		return new WorkflowResponse({
			indexed: syncResult.indexed,
			brands,
			metadata,
		})
	}
)
