import {
	createWorkflow,
	WorkflowResponse,
	transform,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { syncBrandsStep } from "./steps/sync-brands"
import { fetchStrapiBrandContentStep } from "./steps/fetch-strapi-brand-content"
import type { SyncBrandsStepBrand } from "@3dbyte-tech-store/shared-types"
import ProductBrandLink from "../../links/product-brand"

/**
 * Link record structure returned by useQueryGraphStep for product-brand links
 */
interface ProductBrandLinkRecord {
	product_id: string
	brand_id: string
}

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
			fields: ["id", "name", "handle", "created_at", "updated_at"],
			pagination: {
				take: limit,
				skip: offset,
			},
			filters,
		})

		// Step 2: Extract brand IDs for link query
		const brandIds = transform({ brands }, ({ brands }) => {
			return (brands as SyncBrandsStepBrand[]).map((b) => b.id)
		})

		// Step 3: Query product-brand links using the link's entryPoint
		// This is the correct Medusa v2 pattern for querying module links
		const { data: productBrandLinks } = useQueryGraphStep({
			entity: ProductBrandLink.entryPoint,
			fields: ["product_id", "brand_id"],
			filters: {
				brand_id: brandIds,
			},
		}).config({ name: "fetch-product-brand-links" })

		// Step 4: Compute product counts per brand using transform
		const productCounts = transform(
			{ productBrandLinks, brandIds },
			({ productBrandLinks, brandIds }) => {
				const counts: Record<string, number> = {}

				// Initialize all brand counts to 0
				for (const brandId of brandIds as string[]) {
					counts[brandId] = 0
				}

				// Count products per brand using single-pass O(n) algorithm
				for (const link of productBrandLinks as ProductBrandLinkRecord[]) {
					const brandId = link.brand_id
					if (brandId && counts[brandId] !== undefined) {
						counts[brandId]++
					}
				}

				return counts
			}
		)

		// Step 5: Fetch Strapi content for enrichment
		const strapiContents = fetchStrapiBrandContentStep({
			brands: brands as SyncBrandsStepBrand[],
		})

		// Step 6: Sync brands to Meilisearch with Strapi enrichment and product counts
		const syncResult = syncBrandsStep({
			brands: brands as SyncBrandsStepBrand[],
			strapiContents,
			productCounts,
		})

		return new WorkflowResponse({
			indexed: syncResult.indexed,
			brands,
			metadata,
		})
	}
)
