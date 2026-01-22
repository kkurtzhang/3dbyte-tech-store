import {
	SubscriberArgs,
	type SubscriberConfig,
} from "@medusajs/framework"
import { syncBrandsWorkflow } from "../../workflows/meilisearch/brands/sync-brands"

/**
 * Brand Unpublishing Subscriber for Strapi Webhooks
 *
 * NOTE: This subscriber is NOT currently used.
 * The webhook handler directly calls syncBrandsWorkflow for better performance.
 * This file is kept for reference if event-based architecture is needed in the future.
 *
 * Expected webhook payload:
 * {
 *   model: "brand-description" | "brand-descriptions",
 *   entry: {
 *     medusa_brand_id: "brand_123",
 *     // ... other Strapi fields
 *   },
 *   event: "entry.unpublish"
 * }
 *
 * Flow:
 * 1. Strapi unpublishes brand-description content
 * 2. Event fires with brand ID
 * 3. Subscriber triggers syncBrandsWorkflow
 * 4. Workflow fetches Medusa brand (Strapi content returns null/unpublished)
 * 5. Brand re-indexed to Meilisearch with Medusa data only
 * 6. Brand remains searchable with basic information (name, handle)
 */
export default async function brandUnpublishSubscriber({
	event: { data },
	container,
}: SubscriberArgs) {
	const logger = container.resolve("logger")
	const brandId = (data as { id: string }).id

	logger.info(
		`Received brand unpublish event for brand: ${brandId} - re-indexing with Medusa data only`
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
			`Brand ${brandId} re-indexed to Meilisearch with ${result.indexed} documents (Strapi content removed)`
		)
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		logger.error(
			`Failed to re-index brand ${brandId} after unpublish: ${errorMessage}`,
			error
		)
	}
}

/**
 * Subscriber Configuration
 */
export const config: SubscriberConfig = {
	event: "brand-description.unpublished",
}
