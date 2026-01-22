import {
	SubscriberArgs,
	type SubscriberConfig,
} from "@medusajs/framework"
import { syncProductsWorkflow } from "../../workflows/meilisearch/products/sync-products"

/**
 * Product Indexing Subscriber
 *
 * Listens to product.created and product.updated events:
 * - When product is created → Indexes to Meilisearch if published
 * - When product is updated → Indexes to Meilisearch if published, DELETES if not published
 * - When product status changes from published → Auto-removes from Meilisearch
 *
 * Uses syncProductsWorkflow following official Medusa patterns.
 */
export default async function productIndexer({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	await syncProductsWorkflow(container).run({
		input: {
			filters: {
				id: data.id,
			},
		},
	})
}

export const config: SubscriberConfig = {
	event: ["product.created", "product.updated"],
}
