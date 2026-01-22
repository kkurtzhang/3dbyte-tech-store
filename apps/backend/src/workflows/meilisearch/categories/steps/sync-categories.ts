import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../../../../modules/meilisearch"
import { toCategoryDocument, type SyncCategoriesStepCategory } from "../../../../modules/meilisearch/utils"
import type MeilisearchModuleService from "../../../../modules/meilisearch/service"
import type { MeilisearchCategoryDocument } from "@3dbyte-tech-store/shared-types"

/**
 * Input type for sync-categories step
 *
 * Categories come with parent_category relationships from useQueryGraphStep,
 * product_count, and pre-computed breadcrumb and category_ids from the workflow.
 */
export type SyncCategoriesStepInput = {
	categories: Array<
		SyncCategoriesStepCategory & {
			product_count: number
			breadcrumb: Array<{ id: string; name: string; handle: string }>
			category_ids: string[]
		}
	>
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
 * @param categories - Array of categories from Medusa with parent relationships and counts
 * @returns Array of Meilisearch category documents
 *
 * @example
 * Input: [{
 *   id: "cat_1",
 *   name: "Electronics",
 *   handle: "electronics",
 *   product_count: 15,
 *   created_at: "2024-01-01T00:00:00.000Z"
 * }]
 * Output: [{
 *   id: "cat_1",
 *   name: "Electronics",
 *   handle: "electronics",
 *   breadcrumb: [],
 *   category_ids: ["cat_1"],
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
		// Use toCategoryDocument utility function
		// Pass pre-computed breadcrumb and category_ids from workflow
		return toCategoryDocument(
			{
				id: category.id,
				name: category.name,
				handle: category.handle,
				description: category.description,
				parent_category_id: category.parent_category_id,
				parent_category: category.parent_category || undefined,
				rank: category.rank,
				created_at: category.created_at,
				updated_at: category.updated_at || category.created_at,
			},
			category.product_count,
			category.breadcrumb,
			category.category_ids
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
		{ categories }: SyncCategoriesStepInput,
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
		const documents = transformCategoriesToDocuments(categories)

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
