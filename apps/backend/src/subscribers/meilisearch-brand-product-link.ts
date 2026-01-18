import {
	SubscriberArgs,
	type SubscriberConfig,
} from "@medusajs/framework"
import { syncBrandsWorkflow } from "../workflows/meilisearch/sync-brands"

/**
 * Brand-Product Link Subscriber
 *
 * NOTE: This subscriber is NOT currently used.
 * The API routes directly call syncBrandsWorkflow for better performance.
 * This file is kept for reference if event-based architecture is needed in the future.
 *
 * Events handled (if re-enabled):
 * - brand-product.linked: When products are linked to a brand
 * - brand-product.unlinked: When products are unlinked from a brand
 *
 * Flow:
 * 1. Products are linked/unlinked to brand via admin API
 * 2. Event fires with brand ID
 * 3. Subscriber triggers syncBrandsWorkflow
 * 4. Workflow recalculates product_count via link service
 * 5. Brand re-indexed to Meilisearch with updated product_count
 */
export default async function brandProductLinkSubscriber({
	event: { data },
	container,
}: SubscriberArgs) {
	const logger = container.resolve("logger")
	const brandId = (data as { id: string }).id

	logger.info(
		`Received brand-product link change event for brand: ${brandId} - re-indexing to update product_count`
	)

	try {
		const { result } = await syncBrandsWorkflow(container).run({
			input: {
				filters: {
					id: brandId,
				},
			},
		})

		logger.info(
			`Brand ${brandId} re-indexed to Meilisearch with ${result.indexed} documents (product_count updated)`
		)
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		logger.error(
			`Failed to re-index brand ${brandId} after product link change: ${errorMessage}`,
			error
		)
	}
}

/**
 * Subscriber Configuration
 */
export const config: SubscriberConfig = {
	event: ["brand-product.linked", "brand-product.unlinked"],
}
