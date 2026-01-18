import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../../../modules/meilisearch"
import { toCategoryDocument } from "../../../modules/meilisearch/utils"
import type MeilisearchModuleService from "../../../modules/meilisearch/service"
import type { MeilisearchCategoryDocument } from "@3dbyte-tech-store/shared-types"

/**
 * Input type for sync-categories step
 */
export type SyncCategoriesStepInput = {
	categories: Array<{
		id: string
		name: string
		handle: string
		description?: string | null
		parent_category?: {
			id: string
			name: string
			handle?: string
		} | null
		rank: number
		path: string[]
		parent_name?: string
		product_count: number
		created_at: string
	}>
	productCounts: Record<string, number>
}

/**
 * Output type for sync-categories step
 */
export type SyncCategoriesStepOutput = {
	indexed: number
}

/**
 * Compensation data for rollback
 */
type SyncCategoriesStepCompensationData = {
	newCategoryIds: string[]
	existingCategories: Record<string, unknown>[]
}

/**
 * Transform categories to Meilisearch documents
 *
 * This is a pure function that can be tested independently of the workflow step.
 * It transforms categories from Medusa format into Meilisearch documents with
 * all necessary fields for search and browse functionality.
 *
 * @param categories - Array of categories from Medusa with computed paths and counts
 * @returns Array of Meilisearch category documents
 *
 * @example
 * Input: [{
 *   id: "cat_1",
 *   name: "Electronics",
 *   handle: "electronics",
 *   path: ["Electronics"],
 *   product_count: 15,
 *   created_at: "2024-01-01T00:00:00.000Z"
 * }]
 * Output: [{
 *   id: "cat_1",
 *   name: "Electronics",
 *   handle: "electronics",
 *   path: ["Electronics"],
 *   product_count: 15,
 *   created_at: 1704067200000
 * }]
 */
export function transformCategoriesToDocuments(
	categories: SyncCategoriesStepInput["categories"]
): MeilisearchCategoryDocument[] {
	// Handle empty array
	if (!categories || categories.length === 0) {
		return []
	}

	// Transform each category to a Meilisearch document
	return categories.map((category) => {
		// Build parent_category object matching SyncCategoriesStepCategory type
		const parentCategory = category.parent_category
			? ({
					id: category.parent_category.id,
					name: category.parent_category.name,
					handle: category.parent_category.handle || category.parent_category.name.toLowerCase(),
					parent_category: null,
					rank: 0,
					created_at: category.created_at,
					updated_at: category.created_at,
				} as const)
			: null

		// Use toCategoryDocument utility function
		return toCategoryDocument(
			{
				id: category.id,
				name: category.name,
				handle: category.handle,
				description: category.description,
				parent_category: parentCategory,
				rank: category.rank,
				created_at: category.created_at,
				updated_at: category.created_at, // Use created_at as fallback
			},
			category.product_count
		)
	})
}

/**
 * Sync categories to Meilisearch
 *
 * This step transforms categories into Meilisearch documents and indexes them.
 * It includes a compensation function for rollback capability.
 *
 * Key behaviors:
 * - Retrieves existing categories before indexing (for rollback)
 * - Determines which categories are new vs existing
 * - Transforms categories to Meilisearch documents
 * - Indexes the documents
 * - Returns compensation data for rollback
 *
 * @example
 * Input: {
 *   categories: [{ id: "cat_1", name: "Electronics", ... }],
 *   productCounts: { cat_1: 15 }
 * }
 * Output: { indexed: 1 }
 */
export const syncCategoriesStep = createStep(
	"sync-categories",
	async (
		{ categories, productCounts }: SyncCategoriesStepInput,
		{ container }
	) => {
		const meilisearchModuleService =
			container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

		// Handle empty array
		if (!categories || categories.length === 0) {
			return new StepResponse(
				{ indexed: 0 },
				{ newCategoryIds: [], existingCategories: [] }
			)
		}

		// Merge product counts into categories
		const categoriesWithCounts = categories.map((category) => ({
			...category,
			product_count: productCounts[category.id] || 0,
		}))

		// Retrieve existing categories BEFORE indexing (for rollback)
		const existingCategories =
			await meilisearchModuleService.retrieveFromIndex(
				categories.map((cat) => cat.id),
				"category"
			)

		// Determine which categories are new vs existing
		const existingIds = new Set(
			existingCategories.map((cat) => cat.id as string)
		)
		const newCategoryIds = categories
			.filter((category) => !existingIds.has(category.id))
			.map((category) => category.id)

		// Transform categories to Meilisearch documents
		const documents = transformCategoriesToDocuments(categoriesWithCounts)

		// Index the documents
		await meilisearchModuleService.indexData(
			documents as unknown as Record<string, unknown>[],
			"category"
		)

		return new StepResponse(
			{ indexed: documents.length },
			{ newCategoryIds, existingCategories }
		)
	},
	// Compensation function for rollback
	async (compensationData, { container }) => {
		if (!compensationData) {
			return
		}

		const { newCategoryIds, existingCategories } =
			compensationData as SyncCategoriesStepCompensationData

		const meilisearchModuleService =
			container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

		// Delete newly added categories
		if (newCategoryIds && newCategoryIds.length > 0) {
			await meilisearchModuleService.deleteFromIndex(
				newCategoryIds,
				"category"
			)
		}

		// Restore existing categories to their original state
		if (existingCategories && existingCategories.length > 0) {
			await meilisearchModuleService.indexData(
				existingCategories,
				"category"
			)
		}
	}
)
