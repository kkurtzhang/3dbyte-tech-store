import {
	SubscriberArgs,
	type SubscriberConfig,
} from "@medusajs/framework"
import { deleteCategoriesFromMeilisearchWorkflow } from "../workflows/meilisearch/delete-categories-from-meilisearch"
import type { Logger } from "@medusajs/framework/types"

/**
 * Category Deleted Subscriber
 *
 * Listens to product-category.deleted events and removes the category from Meilisearch.
 * Uses deleteCategoriesFromMeilisearchWorkflow following official Medusa patterns.
 *
 * Event: product-category.deleted
 *
 * Workflow behavior:
 * - Removes the deleted category ID from Meilisearch index
 * - Includes compensation for workflow rollback
 *
 * @example
 * When a category is deleted via Admin API:
 * 1. Medusa fires product-category.deleted event
 * 2. This subscriber triggers deleteCategoriesFromMeilisearchWorkflow
 * 3. Category is removed from Meilisearch index
 */
export default async function categoryDeletedHandler({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve<Logger>("logger")

	logger.info(`Category deleted: ${data.id}. Removing from Meilisearch...`)

	try {
		const { result } = await deleteCategoriesFromMeilisearchWorkflow(
			container
		).run({
			input: {
				ids: [data.id],
			},
		})

		logger.info(
			`Successfully removed category ${data.id} from Meilisearch (deleted: ${result.deleted})`
		)
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error"
		logger.error(
			`Failed to remove category ${data.id} from Meilisearch: ${message}`,
			error
		)
		// Don't throw - category deletion should succeed even if search removal fails
	}
}

export const config: SubscriberConfig = {
	event: "product-category.deleted",
}
