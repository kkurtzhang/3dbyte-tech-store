import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { syncCategoriesWorkflow } from "../../../../workflows/meilisearch/categories/sync-categories"
import type { Logger } from "@medusajs/framework/types"

/**
 * POST /admin/meilisearch/sync-categories
 *
 * Admin API endpoint to manually trigger a full sync of all categories to Meilisearch.
 *
 * This endpoint will:
 * - Fetch all active, non-internal categories from Medusa
 * - Compute hierarchy paths for each category
 * - Compute product counts (including aggregated from child categories)
 * - Index all categories to Meilisearch
 * - Delete inactive categories from Meilisearch
 *
 * The sync is performed in batches of 50 categories to handle large datasets efficiently.
 *
 * Example:
 * POST /admin/meilisearch/sync-categories
 *
 * Response:
 * {
 *   "message": "Categories synced to Meilisearch successfully",
 *   "indexed": 15,
 *   "deleted": 0
 * }
 */
export const POST = async (
	req: MedusaRequest,
	res: MedusaResponse
): Promise<void> => {
	const logger = req.scope.resolve<Logger>("logger")

	try {
		logger.info("Starting manual Meilisearch category sync...")

		let hasMore = true
		let offset = 0
		const limit = 50
		let totalIndexed = 0
		let totalDeleted = 0

		// Paginated sync following official pattern
		while (hasMore) {
			const { result } = await syncCategoriesWorkflow(req.scope).run({
				input: {
					limit,
					offset,
				},
			})

			// Check if we have more categories to sync
			// If the number of indexed categories is less than the limit, we've reached the end
			hasMore = result.indexed >= limit
			offset += limit
			totalIndexed += result.indexed
			totalDeleted += result.deleted
		}

		logger.info(
			`Meilisearch category sync completed: ${totalIndexed} indexed, ${totalDeleted} deleted`
		)

		res.json({
			message: "Categories synced to Meilisearch successfully",
			indexed: totalIndexed,
			deleted: totalDeleted,
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error"
		logger.error("Failed to sync categories to Meilisearch:", error)
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`Failed to sync categories to Meilisearch: ${message}`
		)
	}
}

/**
 * GET /admin/meilisearch/sync-categories
 *
 * Returns information about the sync endpoint (for discovery)
 */
export const GET = async (
	req: MedusaRequest,
	res: MedusaResponse
): Promise<void> => {
	res.json({
		endpoint: "/admin/meilisearch/sync-categories",
		method: "POST",
		description: "Manually trigger a full sync of all categories to Meilisearch",
		behavior:
			"Syncs all active, non-internal categories from Medusa to Meilisearch with computed hierarchy paths and product counts",
		example: {
			request: "POST /admin/meilisearch/sync-categories",
			response: {
				message: "Categories synced to Meilisearch successfully",
				indexed: 15,
				deleted: 0,
			},
		},
	})
}
