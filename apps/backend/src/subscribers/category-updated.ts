import {
	SubscriberArgs,
	type SubscriberConfig,
} from "@medusajs/framework"
import { syncCategoriesWorkflow } from "../workflows/meilisearch/sync-categories"
import type { Logger } from "@medusajs/framework/types"

/**
 * Category Updated Subscriber
 *
 * Listens to product-category.updated events and re-indexes the category to Meilisearch.
 * Uses syncCategoriesWorkflow following official Medusa patterns.
 *
 * Event: product-category.updated
 *
 * Workflow behavior:
 * - Fetches the updated category from Medusa
 * - Recomputes hierarchy path and product counts
 * - Updates index if category is active
 * - Deletes from index if category became inactive
 *
 * @example
 * When a category is updated via Admin API:
 * 1. Medusa fires product-category.updated event
 * 2. This subscriber triggers syncCategoriesWorkflow
 * 3. Category is re-indexed to Meilisearch with updated data
 * 4. If category became inactive, it's removed from Meilisearch
 */
export default async function categoryUpdatedHandler({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve<Logger>("logger")

	logger.info(`Category updated: ${data.id}. Re-syncing to Meilisearch...`)

	try {
		const { result } = await syncCategoriesWorkflow(container).run({
			input: {
				filters: {
					id: data.id,
				},
			},
		})

		logger.info(
			`Successfully re-synced category ${data.id} to Meilisearch (indexed: ${result.indexed}, deleted: ${result.deleted})`
		)
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error"
		logger.error(
			`Failed to re-sync category ${data.id} to Meilisearch: ${message}`,
			error
		)
		// Don't throw - category update should succeed even if search sync fails
	}
}

export const config: SubscriberConfig = {
	event: "product-category.updated",
}
