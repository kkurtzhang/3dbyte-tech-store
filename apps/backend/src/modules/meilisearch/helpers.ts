import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { MEILISEARCH_MODULE } from "."
import { STRAPI_MODULE } from "../strapi"
import type MeilisearchModuleService from "./service"
import type StrapiModuleService from "../strapi/service"
import { toMeilisearchDocument } from "./utils"

/**
 * Shared helper to index a single product to Meilisearch with Strapi enrichment.
 *
 * This helper is used by both:
 * - Subscribers (Medusa product events)
 * - Webhooks (Strapi content updates)
 *
 * @param container - Medusa dependency injection container
 * @param productId - The Medusa product ID to index
 * @returns Object with success status and error if failed
 */
export async function indexProduct(
	container: any,
	productId: string
): Promise<{ success: boolean; error?: string }> {
	const logger: any = container.resolve("logger")

	logger.info(`Indexing product ${productId} into Meilisearch...`)

	try {
		// 1. Resolve services from container
		const strapiModule: StrapiModuleService = container.resolve(STRAPI_MODULE)
		const meilisearchModule: MeilisearchModuleService =
			container.resolve(MEILISEARCH_MODULE)
		const query = container.resolve(ContainerRegistrationKeys.QUERY)

		// 2. Fetch product from Medusa with relations using Query
		// Query is more flexible for nested relations and cross-module data
		const { data: products } = await query.graph({
			entity: "product",
			fields: [
				"id",
				"*",
				"variants.*",
				"variants.prices.*",
				"images.*",
				"categories.*",
				"tags.*",
			],
			filters: {
				id: productId,
			},
		})

		const product = products?.[0]

		if (!product) {
			logger.warn(`Product ${productId} not found, skipping indexing`)
			return { success: false, error: "Product not found" }
		}

		// Only index published products (skip draft, proposed, rejected)
		if (product.status !== "published") {
			logger.info(
				`Product ${productId} has status "${product.status}", deleting from Meilisearch if indexed`
			)
			// Delete from Meilisearch if product was previously indexed
			try {
				await meilisearchModule.deleteFromIndex([productId], "product")
				logger.info(`Deleted product ${productId} from Meilisearch (status changed to ${product.status})`)
			} catch (error) {
				// Non-blocking: ignore if product wasn't indexed
				logger.warn(
					`Failed to delete product ${productId} from Meilisearch: ${error instanceof Error ? error.message : "Unknown error"}`
				)
			}
			return { success: true }
		}

		// 3. Fetch Strapi content (non-blocking)
		let enrichedContent = null
		try {
			enrichedContent = await strapiModule.getProductDescription(productId)
			logger.info(`Found Strapi content for product ${productId}`)
		} catch (e) {
			// Non-blocking: continue without Strapi content
			logger.warn(
				`Strapi fetch failed for product ${productId}, indexing with base data: ${e instanceof Error ? e.message : "Unknown error"}`
			)
		}

		// 4. Transform and index to Meilisearch
		const document = toMeilisearchDocument(product, enrichedContent)
		await meilisearchModule.indexData([document], "product")

		logger.info(`Successfully indexed product ${productId} into Meilisearch`)
		return { success: true }
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		logger.error(`Failed to index product ${productId}: ${errorMessage}`, error)
		return { success: false, error: errorMessage }
	}
}
