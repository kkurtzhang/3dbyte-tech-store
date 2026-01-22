import {
	SubscriberArgs,
	type SubscriberConfig,
} from "@medusajs/framework"
import { syncCategoriesWorkflow } from "../../workflows/meilisearch/categories/sync-categories"
import type { Logger } from "@medusajs/framework/types"

/**
 * Category Created Subscriber
 *
 * Listens to product-category.created events and indexes the new category to Meilisearch.
 * Uses syncCategoriesWorkflow following official Medusa patterns.
 *
 * Event: product-category.created
 *
 * Workflow behavior:
 * - Fetches the newly created category from Medusa
 * - Computes hierarchy path and product counts
 * - Indexes to Meilisearch if category is active
 *
 * @example
 * When a category is created via Admin API:
 * 1. Medusa fires product-category.created event
 * 2. This subscriber triggers syncCategoriesWorkflow
 * 3. Category is indexed to Meilisearch with computed data
 */
export default async function categoryCreatedHandler({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve<Logger>("logger")

	logger.info(`Category created: ${data.id}. Syncing to Meilisearch...`)

	try {
		const { result } = await syncCategoriesWorkflow(container).run({
			input: {
				filters: {
					id: data.id,
				},
			},
		})

		logger.info(
			`Successfully synced category ${data.id} to Meilisearch (indexed: ${result.indexed}, deleted: ${result.deleted})`
		)
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error"
		logger.error(
			`Failed to sync category ${data.id} to Meilisearch: ${message}`,
			error
		)
		// Don't throw - category creation should succeed even if search sync fails
	}
}

export const config: SubscriberConfig = {
	event: "product-category.created",
}
