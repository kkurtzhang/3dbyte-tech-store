import {
	createWorkflow,
	transform,
	WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { computeCategoryPathStep } from "./steps/compute-category-path"
import { computeProductCountsStep } from "./steps/compute-product-counts"
import { syncCategoriesStep } from "./steps/sync-categories"
import { deleteCategoriesFromMeilisearchStep } from "./steps/delete-categories-from-meilisearch"

/**
 * Input type for sync-categories workflow
 */
export type SyncCategoriesWorkflowInput = {
	filters?: Record<string, unknown>
	limit?: number
	offset?: number
}

/**
 * Output type for sync-categories workflow
 */
export type SyncCategoriesWorkflowOutput = {
	indexed: number
	deleted: number
	total: number
	metadata?: {
		count: number
		skip: number
		take: number
	}
}

/**
 * Sync categories to Meilisearch workflow
 *
 * This workflow orchestrates the category synchronization process to Meilisearch.
 * It fetches active categories from Medusa, computes hierarchy paths and product counts,
 * indexes them to Meilisearch, and handles cleanup of inactive categories.
 *
 * Workflow steps:
 * - Fetch categories from Medusa with filters (active, non-internal, not deleted)
 * - Separate active vs inactive categories
 * - Compute hierarchy paths for each category
 * - Compute product counts (including child category aggregation)
 * - Sync active categories to Meilisearch
 * - Delete inactive categories from Meilisearch (currently none due to query filters)
 *
 * @param filters - Optional filters for category query
 * @param limit - Optional pagination limit (default: 50)
 * @param offset - Optional pagination offset (default: 0)
 *
 * @returns Statistics about the sync operation (indexed, deleted, total)
 *
 * @example
 * ```typescript
 * const result = await syncCategoriesWorkflow.run({
 *   filters: { is_active: true },
 *   limit: 100,
 *   offset: 0
 * })
 * // Returns: { indexed: 45, deleted: 3, total: 48 }
 * ```
 */
export const syncCategoriesWorkflow = createWorkflow(
	"sync-categories",
	({ filters, limit, offset }: SyncCategoriesWorkflowInput) => {
		// Step 1: Fetch categories from Medusa using useQueryGraphStep
		// Entity is "product_category" in Medusa v2
		const { data: categories, metadata } = useQueryGraphStep({
			entity: "product_category",
			fields: [
				"id",
				"name",
				"handle",
				"description",
				"parent_category.id",
				"parent_category.name",
				"parent_category.handle",
				"rank",
				"is_active",
				"is_internal",
				"created_at",
				"updated_at",
			],
			pagination: {
				take: limit,
				skip: offset,
			},
			filters: {
				// Only fetch active, non-internal, non-deleted categories
				is_active: true,
				is_internal: false,
				deleted_at: null,
				...filters,
			},
		})

		// Step 2: Use transform to prepare categories for path computation
		// Since we're filtering in the query, all returned categories are active
		const activeCategories = transform(
			{ categories },
			(data) => {
				// All categories from the query are already filtered as active
				return {
					activeCategories: data.categories,
					inactiveCategoryIds: [],
				}
			}
		)

		// Step 3: Compute hierarchy paths for each category
		const { categories: categoriesWithPath } = computeCategoryPathStep({
			categories: activeCategories.activeCategories,
		})

		// Step 4: Compute product counts (direct + aggregated from children)
		const { productCounts } = computeProductCountsStep({
			categories: activeCategories.activeCategories,
		})

		// Step 5: Prepare categories for sync by merging product counts
		// Note: This merge is required for TypeScript type safety, even though syncCategoriesStep
		// will also merge productCounts. The step expects the input to have product_count.
		const categoriesForSync = transform(
			{ categories: categoriesWithPath, productCounts },
			(data) => {
				return data.categories.map((category) => ({
					...category,
					product_count: data.productCounts[category.id] || 0,
				}))
			}
		)

		// Step 6: Sync active categories to Meilisearch with computed data
		const syncResult = syncCategoriesStep({
			categories: categoriesForSync,
			productCounts,
		})

		// Step 7: Delete inactive categories from Meilisearch
		// (None expected since we filter in the query, but kept for future use)
		deleteCategoriesFromMeilisearchStep({
			ids: activeCategories.inactiveCategoryIds,
		})

		return new WorkflowResponse({
			indexed: syncResult.indexed,
			deleted: activeCategories.inactiveCategoryIds.length,
			total: syncResult.indexed + activeCategories.inactiveCategoryIds.length,
			metadata,
		})
	}
)
