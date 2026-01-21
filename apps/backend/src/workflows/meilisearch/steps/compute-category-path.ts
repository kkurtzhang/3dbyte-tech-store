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
			display_path?: string
		}
	>
}

/**
 * Compute hierarchy paths and parent breadcrumbs for categories
 *
 * This is a pure function that can be tested independently of the workflow step.
 * It traverses parent_category relationships to build:
 * - path: Array of category names from root to current category
 * - display_path: Breadcrumb string of parent hierarchy
 *
 * @param categories - Array of categories from Medusa
 * @returns Array of categories with computed path and display_path fields
 *
 * @example
 * Input: [{ name: "Shoes", parent_category: { name: "Men", parent_category: null } }]
 * Output: [{ ...category, path: ["Men", "Shoes"], display_path: "Men" }]
 */
export function computeCategoryPathsForCategories(
	categories: SyncCategoriesStepCategory[]
): ComputeCategoryPathStepOutput["categories"] {
	// Handle empty array
	if (!categories || categories.length === 0) {
		return []
	}

	// Compute path and display_path for each category
	return categories.map((category) => {
		const path = computeCategoryPath(category)
		const parentName = computeParentName(category)

		return {
			...category,
			path,
			display_path: parentName || undefined,
		}
	})
}

/**
 * Compute hierarchy paths and parent breadcrumbs for categories
 *
 * This step traverses parent_category relationships to build:
 * - path: Array of category names from root to current category
 * - display_path: Breadcrumb string of parent hierarchy
 *
 * @example
 * Input: { name: "Shoes", parent_category: { name: "Men", parent_category: { name: "Apparel", parent_category: null } } }
 * Output: { path: ["Apparel", "Men", "Shoes"], display_path: "Apparel > Men" }
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
