import {
	createWorkflow,
	transform,
	WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import type { SyncCategoriesStepCategory } from "../../modules/meilisearch/utils"
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
 * It fetches active categories from Medusa, computes product counts,
 * indexes them to Meilisearch, and handles cleanup of inactive categories.
 *
 * Workflow steps:
 * - Fetch categories from Medusa with products relation (active, non-internal, not deleted)
 * - Extract products from categories and compute product counts
 * - Transform to Meilisearch documents (breadcrumb generated internally from parent_category)
 * - Sync to Meilisearch
 * - Delete inactive categories from Meilisearch (currently none due to query filters)
 *
 * Performance: O(n) for product count aggregation
 * Memory: O(n) for category map and product counts
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
		// Step 1: Fetch categories with products relation and nested parent_category (up to 4 levels)
		// This enables full breadcrumb path computation.
		// Parent hierarchy: parent_category (level 1), parent_category.parent_category (level 2), etc.
		const categoriesResult = useQueryGraphStep({
			entity: "product_category",
			fields: [
				"id",
				"name",
				"handle",
				"description",
				"parent_category_id",
				// Level 1: Immediate parent
				"parent_category.id",
				"parent_category.name",
				"parent_category.handle",
				"parent_category.parent_category_id",
				// Level 2: Grandparent
				"parent_category.parent_category.id",
				"parent_category.parent_category.name",
				"parent_category.parent_category.handle",
				"parent_category.parent_category.parent_category_id",
				// Level 3: Great-grandparent
				"parent_category.parent_category.parent_category.id",
				"parent_category.parent_category.parent_category.name",
				"parent_category.parent_category.parent_category.handle",
				"parent_category.parent_category.parent_category.parent_category_id",
				// Level 4: 4th level ancestor
				"parent_category.parent_category.parent_category.parent_category.id",
				"parent_category.parent_category.parent_category.parent_category.name",
				"parent_category.parent_category.parent_category.parent_category.handle",
				"rank",
				"is_active",
				"is_internal",
				"created_at",
				"updated_at",
				"products.id",
				"products.status",
			],
			filters: {
				is_active: true,
				is_internal: false,
				deleted_at: null,
				...filters,
			},
		})

		// Step 2: Transform to compute product counts
		const categoriesForSync = transform(
			{
				allCategories: categoriesResult.data,
				limit,
				offset,
			},
			(data) => {
				const categoriesWithProducts = data.allCategories as Array<{
					id: string
					name: string
					handle: string
					description?: string | null
					parent_category_id?: string | null
					parent_category?: {
						id: string
						name: string
						handle: string
						parent_category_id?: string | null
						parent_category?: {
							id: string
							name: string
							handle: string
							parent_category_id?: string | null
							parent_category?: {
								id: string
								name: string
								handle: string
								parent_category_id?: string | null
								parent_category?: {
									id: string
									name: string
									handle: string
									parent_category_id?: string | null
								}
							}
						}
					} | null
					rank: number
					is_active: boolean
					is_internal: boolean
					created_at: string | Date
					updated_at: string | Date
					products?: Array<{
						id: string
						status: string
					} | null>
				}>

				// Compute product counts (direct assignments only)
				const directCounts: Record<string, number> = {}
				for (const category of categoriesWithProducts) {
					// Count only published products
					const publishedProducts =
						category.products?.filter(
							(p) => p && p.status === "published"
						) || []
					directCounts[category.id] = publishedProducts.length
				}

				// Aggregate child category counts to parents
				// Build child map: parentId -> [childIds]
				const childMap = new Map<string, string[]>()
				for (const category of categoriesWithProducts) {
					if (category.parent_category_id) {
						const parentId = category.parent_category_id
						if (!childMap.has(parentId)) {
							childMap.set(parentId, [])
						}
						childMap.get(parentId)!.push(category.id)
					}
				}

				// Aggregate counts upward using post-order traversal
				const productCounts: Record<string, number> = {}

				function addDescendantCounts(categoryId: string): number {
					// Start with direct count
					let total = directCounts[categoryId] || 0

					// Add counts from all children recursively
					const children = childMap.get(categoryId) || []
					for (const childId of children) {
						total += addDescendantCounts(childId)
					}

					// Store the aggregated count
					productCounts[categoryId] = total
					return total
				}

				// Start aggregation from all categories
				for (const category of categoriesWithProducts) {
					// Only start from root categories (no parent) or if not yet computed
					if (!category.parent_category_id || productCounts[category.id] === undefined) {
						addDescendantCounts(category.id)
					}
				}

				// Build a lookup map of all categories by ID for efficient parent traversal
				const categoryMap = new Map<string, typeof categoriesWithProducts[0]>()
				for (const cat of categoriesWithProducts) {
					categoryMap.set(cat.id, cat)
				}

				// Build categories array for sync step with full breadcrumb
				const categories = categoriesWithProducts.map((cat) => {
					// Build full breadcrumb and category_ids by traversing up using parent_category_id
					const breadcrumb: Array<{
						id: string
						name: string
						handle: string
					}> = []
					const categoryIds: string[] = [cat.id]

					// Traverse up the hierarchy using parent_category_id and the lookup map
					let currentParentId = cat.parent_category_id
					while (currentParentId) {
						const parentCat = categoryMap.get(currentParentId)
						if (!parentCat) break // Parent not in our fetched set

						breadcrumb.unshift({
							id: parentCat.id,
							name: parentCat.name,
							handle: parentCat.handle,
						})
						categoryIds.unshift(parentCat.id)

						// Move to next parent
						currentParentId = parentCat.parent_category_id
					}

					return {
						id: cat.id,
						name: cat.name,
						handle: cat.handle,
						description: cat.description,
						parent_category_id: cat.parent_category_id,
						parent_category: cat.parent_category || null,
						rank: cat.rank,
						created_at: cat.created_at,
						updated_at: cat.updated_at,
						product_count: productCounts[cat.id] || 0,
						breadcrumb,
						category_ids: categoryIds,
					}
				})

				// Apply pagination
				const start = data.offset || 0
				const end = start + (data.limit || categories.length)
				const paginatedCategories = categories.slice(start, end)

				return {
					categories: paginatedCategories,
					totalCount: data.allCategories.length,
				}
			}
		)

		// Step 3: Sync categories to Meilisearch
		const syncResult = syncCategoriesStep({
			categories: categoriesForSync.categories as Array<
				SyncCategoriesStepCategory & {
					product_count: number
					breadcrumb: Array<{ id: string; name: string; handle: string }>
					category_ids: string[]
				}
			>,
		})

		// Step 4: Delete inactive categories from Meilisearch (currently none)
		deleteCategoriesFromMeilisearchStep({
			ids: [],
		})

		// Calculate result using transform (required by Medusa workflows)
		const result = transform(
			{ syncResult, totalCount: categoriesForSync.totalCount },
			(data) => ({
				indexed: data.syncResult.indexed,
				deleted: 0,
				total: data.syncResult.indexed,
			})
		)

		return new WorkflowResponse(result)
	}
)
