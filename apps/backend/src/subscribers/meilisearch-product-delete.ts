import {
	SubscriberArgs,
	type SubscriberConfig,
} from "@medusajs/framework"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"
import type MeilisearchModuleService from "../modules/meilisearch/service"

/**
 * Product Deletion Subscriber
 *
 * Listens to product.deleted events and removes the product from Meilisearch.
 */
export default async function productDeleter({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const meilisearchModule: MeilisearchModuleService = container.resolve(MEILISEARCH_MODULE)
	const logger: any = container.resolve("logger")

	logger.info(`Removing product ${data.id} from Meilisearch...`)

	try {
		await meilisearchModule.deleteFromIndex([data.id], "product")
		logger.info(
			`Successfully removed product ${data.id} from Meilisearch`
		)
	} catch (error) {
		logger.error(
			`Failed to remove product ${data.id} from Meilisearch: ${error instanceof Error ? error.message : 'Unknown error'}`,
			error
		)
		// Don't throw - product deletion should succeed even if search removal fails
	}
}

export const config: SubscriberConfig = {
	event: "product.deleted",
}
