import {
	SubscriberArgs,
	type SubscriberConfig,
} from "@medusajs/framework"
import { syncBrandsWorkflow } from "../../workflows/meilisearch/brands/sync-brands"

/**
 * Brand Indexing Subscriber for Strapi Webhooks
 *
 * NOTE: This subscriber is NOT currently used.
 * The webhook handler directly calls syncBrandsWorkflow for better performance.
 * This file is kept for reference if event-based architecture is needed in the future.
 *
 * IMPORTANT: We avoid brand.created events to prevent race conditions.
 * Strapi webhooks fire AFTER content is published, ensuring enrichment is available.
 *
 * Events handled (if re-enabled):
 * - brand-description.published: When brand content is published in Strapi
 *
 * Flow:
 * 1. Strapi publishes brand-description content
 * 2. Event fires with brand ID
 * 3. Subscriber triggers syncBrandsWorkflow
 * 4. Workflow fetches Medusa brand + Strapi enrichment
 * 5. Brand indexed to Meilisearch with full content
 */
export default async function brandIndexSubscriber({
	event: { data },
	container,
}: SubscriberArgs) {
	const logger = container.resolve("logger")
	const brandId = (data as { id: string }).id

	logger.info(`Received brand indexing event for brand: ${brandId}`)

	try {
		const { result } = await syncBrandsWorkflow(container).run({
			input: {
				filters: {
					id: brandId,
				},
			},
		})

		logger.info(
			`Brand ${brandId} indexed to Meilisearch with ${result.indexed} documents`
		)
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		logger.error(`Failed to index brand ${brandId}: ${errorMessage}`, error)
	}
}

/**
 * Subscriber Configuration
 */
export const config: SubscriberConfig = {
	event: "brand-description.published",
}
