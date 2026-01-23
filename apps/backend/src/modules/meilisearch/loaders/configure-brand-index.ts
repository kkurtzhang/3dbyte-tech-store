import type { LoaderOptions } from "@medusajs/framework/types"
import type { Logger } from "@medusajs/framework/types"
import { BRAND_INDEX_SETTINGS, type MeilisearchOptions } from "../service"
import MeilisearchModuleService from "../service"

/**
 * Meilisearch Brand Index Configuration Loader
 *
 * Initializes the brand index with proper settings on application startup.
 *
 * Why this loader?
 * - Meilisearch auto-creates indexes with default settings when first used
 * - Custom settings (ranking rules, filterable attributes) must be applied manually
 * - Loader runs once on startup, ensuring consistent configuration
 *
 * @param options - Loader options containing container and module options
 */
export default async function configureBrandIndexLoader({
	container,
	options,
}: LoaderOptions): Promise<void> {
	const logger: Logger = container.resolve("logger")

	try {
		// Module options are required for Meilisearch service initialization
		if (!options) {
			throw new Error("Meilisearch module options are required")
		}

		// Create a new instance of the Meilisearch service with module options
		// This ensures the service is properly initialized with the correct configuration
		const meilisearchService = new MeilisearchModuleService(
			{ logger },
			options as MeilisearchOptions
		)

		logger.info("Configuring Meilisearch brand index...")

		// Configure brand index with custom settings
		// This ensures proper search behavior, ranking rules, and filtering
		await meilisearchService.configureIndex(BRAND_INDEX_SETTINGS, "brand")

		logger.info("Brand index configured successfully")
	} catch (error) {
		// Log error but don't fail startup
		const message = error instanceof Error ? error.message : "Unknown error"
		logger.warn(`Failed to configure Meilisearch brand index: ${message}`)
		logger.warn("Brand indexing will use default Meilisearch settings")
	}
}
