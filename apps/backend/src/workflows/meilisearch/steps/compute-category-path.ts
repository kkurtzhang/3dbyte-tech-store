import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { computeCategoryPath, computeParentName } from "../../../modules/meilisearch/utils"
import type { SyncCategoriesStepCategory } from "../../../modules/meilisearch/utils"

/**
 * Input type for compute-category-path step
 */
export type ComputeCategoryPathStepInput = {
	categories: SyncCategoriesStepCategory[]
}

/**
 * Output type for compute-category-path step
 */
export type ComputeCategoryPathStepOutput = {
	categories: Array<
		SyncCategoriesStepCategory & {
			path: string[]
			parent_name?: string
		}
	>
}

/**
 * Compute hierarchy paths and parent breadcrumbs for categories
 *
 * This is a pure function that can be tested independently of the workflow step.
 * It traverses parent_category relationships to build:
 * - path: Array of category names from root to current category
 * - parent_name: Breadcrumb string of parent hierarchy
 *
 * @param categories - Array of categories from Medusa
 * @returns Array of categories with computed path and parent_name fields
 *
 * @example
 * Input: [{ name: "Shoes", parent_category: { name: "Men", parent_category: null } }]
 * Output: [{ ...category, path: ["Men", "Shoes"], parent_name: "Men" }]
 */
export function computeCategoryPathsForCategories(
	categories: SyncCategoriesStepCategory[]
): ComputeCategoryPathStepOutput["categories"] {
	// Handle empty array
	if (!categories || categories.length === 0) {
		return []
	}

	// Compute path and parent_name for each category
	return categories.map((category) => {
		const path = computeCategoryPath(category)
		const parentName = computeParentName(category)

		return {
			...category,
			path,
			parent_name: parentName || undefined,
		}
	})
}

/**
 * Compute hierarchy paths and parent breadcrumbs for categories
 *
 * This step traverses parent_category relationships to build:
 * - path: Array of category names from root to current category
 * - parent_name: Breadcrumb string of parent hierarchy
 *
 * @example
 * Input: { name: "Shoes", parent_category: { name: "Men", parent_category: { name: "Apparel", parent_category: null } } }
 * Output: { path: ["Apparel", "Men", "Shoes"], parent_name: "Apparel > Men" }
 */
export const computeCategoryPathStep = createStep(
	"compute-category-path",
	async ({ categories }: ComputeCategoryPathStepInput) => {
		const enrichedCategories = computeCategoryPathsForCategories(categories)

		return new StepResponse({
			categories: enrichedCategories,
		})
	}
	// No compensation function needed (read-only operation)
)
