import {
	SubscriberArgs,
	type SubscriberConfig,
} from "@medusajs/framework"
import { indexProduct } from "../modules/meilisearch/helpers"

/**
 * Product Indexing Subscriber
 *
 * Listens to product.created and product.updated events:
 * - When product is created → Indexes to Meilisearch if published
 * - When product is updated → Indexes to Meilisearch if published, DELETES if not published
 * - When product status changes from published → Auto-removes from Meilisearch
 *
 * Uses shared indexProduct helper to avoid code duplication with webhook handler.
 */
export default async function productIndexer({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	// Use shared helper to index the product
	await indexProduct(container, data.id)
}

export const config: SubscriberConfig = {
	event: ["product.created", "product.updated"],
}
