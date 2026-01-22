import {
	SubscriberArgs,
	type SubscriberConfig,
} from "@medusajs/framework"
import { deleteProductsFromMeilisearchWorkflow } from "../../workflows/meilisearch/products/delete-products-from-meilisearch"
import type { Logger } from "@medusajs/framework/types"

/**
 * Product Deletion Subscriber
 *
 * Listens to product.deleted events and removes the product from Meilisearch.
 * Uses deleteProductsFromMeilisearchWorkflow following official Medusa patterns.
 */
export default async function productDeleter({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve<Logger>("logger")

	logger.info(`Removing product ${data.id} from Meilisearch...`)

	try {
		await deleteProductsFromMeilisearchWorkflow(container).run({
			input: {
				ids: [data.id],
			},
		})

		logger.info(`Successfully removed product ${data.id} from Meilisearch`)
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error"
		logger.error(
			`Failed to remove product ${data.id} from Meilisearch: ${message}`,
			error
		)
		// Don't throw - product deletion should succeed even if search removal fails
	}
}

export const config: SubscriberConfig = {
	event: "product.deleted",
}
