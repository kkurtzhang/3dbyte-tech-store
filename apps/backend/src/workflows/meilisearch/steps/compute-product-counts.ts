import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import type { SyncCategoriesStepCategory } from "../../../modules/meilisearch/utils"

/**
 * Input type for compute-product-counts step
 */
export type ComputeProductCountsStepInput = {
	categories: SyncCategoriesStepCategory[]
}

/**
 * Output type for compute-product-counts step
 */
export type ComputeProductCountsStepOutput = {
	productCounts: Record<string, number> // category_id → product_count
}

/**
 * Product type from Medusa query (matches useQueryGraphStep output)
 */
export interface ProductFromQuery {
	id: string
	status: string
	categories?: Array<{
		id: string
		name: string
		handle: string
	}> | null
}

/**
 * Compute product counts for categories (direct assignments only)
 *
 * This is a pure function that can be tested independently of the workflow step.
 * It counts published products for each category based on direct product-category assignments.
 *
 * Key behaviors:
 * - Only counts published products (status = "published")
 * - Counts direct assignments only (not recursive/parent category aggregation)
 * - Products can belong to multiple categories (counted in each)
 * - Empty categories return count = 0
 *
 * @param products - Array of products from Medusa with categories relation
 * @param categoryIds - Array of category IDs to count products for
 * @returns Record mapping category_id to direct product count
 *
 * @example
 * Input: products = [
 *   { id: "prod_1", status: "published", categories: [{ id: "cat_1" }, { id: "cat_2" }] },
 *   { id: "prod_2", status: "published", categories: [{ id: "cat_1" }] },
 *   { id: "prod_3", status: "draft", categories: [{ id: "cat_2" }] }
 * ], categoryIds = ["cat_1", "cat_2"]
 * Output: { cat_1: 2, cat_2: 1 }
 */
export function computeProductCountsForCategories(
	products: ProductFromQuery[],
	categoryIds: string[]
): Record<string, number> {
	// Initialize counts to 0 for all categories
	const productCounts: Record<string, number> = {}
	categoryIds.forEach((categoryId) => {
		productCounts[categoryId] = 0
	})

	// Count only published products
	const publishedProducts = products.filter(
		(product) => product.status === "published"
	)

	// Aggregate counts by category
	for (const product of publishedProducts) {
		if (!product.categories || product.categories.length === 0) {
			continue
		}

		// Increment count for each category this product belongs to
		for (const category of product.categories) {
			if (category.id in productCounts) {
				productCounts[category.id]++
			}
		}
	}

	return productCounts
}

/**
 * Aggregate child category counts upward to parent categories
 *
 * This function takes direct product counts and aggregates them upward
 * through the category hierarchy. Parent categories will show the sum of
 * their direct products plus all products in their descendant categories.
 *
 * @param categories - Array of categories with hierarchy information
 * @param directCounts - Record of category_id to direct product count
 * @returns Record mapping category_id to aggregated product count (including descendants)
 *
 * @example
 * Input: categories = [
 *   { id: "cat_1", parent_category: null },  // Electronics (parent)
 *   { id: "cat_2", parent_category: { id: "cat_1" } }  // Laptops (child)
 * ],
 * directCounts = { cat_1: 0, cat_2: 5 }
 * Output: { cat_1: 5, cat_2: 5 }  // Parent now shows child products
 */
export function aggregateChildCategoryCounts(
	categories: SyncCategoriesStepCategory[],
	directCounts: Record<string, number>
): Record<string, number> {
	// Build child map: parentId -> [childIds]
	const childMap = new Map<string, string[]>()
	for (const cat of categories) {
		if (cat.parent_category?.id) {
			const parentId = cat.parent_category.id
			if (!childMap.has(parentId)) {
				childMap.set(parentId, [])
			}
			childMap.get(parentId)!.push(cat.id)
		}
	}

	// Create a map for quick category lookup
	const categoryMap = new Map<string, SyncCategoriesStepCategory>()
	for (const cat of categories) {
		categoryMap.set(cat.id, cat)
	}

	// Aggregate counts upward using post-order traversal
	const aggregatedCounts: Record<string, number> = { ...directCounts }

	function addDescendantCounts(categoryId: string): number {
		// Start with direct count
		let total = directCounts[categoryId] || 0

		// Add counts from all children recursively
		const children = childMap.get(categoryId) || []
		for (const childId of children) {
			total += addDescendantCounts(childId)
		}

		// Store the aggregated count
		aggregatedCounts[categoryId] = total
		return total
	}

	// Start aggregation from all categories (will handle entire tree)
	for (const cat of categories) {
		// Only start from root categories or if not yet computed
		if (!cat.parent_category || aggregatedCounts[cat.id] === directCounts[cat.id]) {
			addDescendantCounts(cat.id)
		}
	}

	return aggregatedCounts
}

/**
 * Compute product counts for categories
 *
 * This step queries all published products from Medusa and counts
 * how many products are assigned to each category, including aggregation
 * from child categories to parent categories.
 *
 * The count for each category includes:
 * - Direct product assignments to the category
 * - Products from all descendant categories (aggregated upward)
 *
 * @example
 * Input: { categories: [{ id: "cat_1", name: "Electronics", parent_category: null }, { id: "cat_2", name: "Laptops", parent_category: { id: "cat_1" } }] }
 * Output: { productCounts: { "cat_1": 15, "cat_2": 8 } }  // Parent includes child counts
 */
export const computeProductCountsStep = createStep(
	"compute-product-counts",
	async ({ categories }: ComputeProductCountsStepInput) => {
		// Handle empty array
		if (!categories || categories.length === 0) {
			return new StepResponse<ComputeProductCountsStepOutput>({
				productCounts: {},
			})
		}

		// Extract category IDs for initialization
		const categoryIds = categories.map((cat) => cat.id)

		// Query all published products with their categories
		const { data: products } = useQueryGraphStep({
			entity: "product",
			fields: [
				"id",
				"status",
				"categories.id",
				"categories.name",
				"categories.handle",
			],
			filters: {
				status: "published",
			},
		})

		// Compute direct product counts (category assignments only)
		const directCounts = computeProductCountsForCategories(
			products as ProductFromQuery[],
			categoryIds
		)

		// Aggregate child category counts upward to parents
		const aggregatedCounts = aggregateChildCategoryCounts(
			categories,
			directCounts
		)

		return new StepResponse<ComputeProductCountsStepOutput>({
			productCounts: aggregatedCounts,
		})
	}
	// No compensation function needed (read-only operation)
)
