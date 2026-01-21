import type { LoaderOptions } from "@medusajs/framework/types"
import type { Logger } from "@medusajs/framework/types"
import { CATEGORY_INDEX_SETTINGS, type MeilisearchOptions } from "../service"
import MeilisearchModuleService from "../service"

/**
 * Meilisearch Category Index Configuration Loader
 *
 * Initializes the category index with proper settings on application startup.
 *
 * Why this loader?
 * - Meilisearch auto-creates indexes with default settings when first used
 * - Custom settings (ranking rules, filterable attributes) must be applied manually
 * - Loader runs once on startup, ensuring consistent configuration
 *
 * @param options - Loader options containing container and module options
 */
export default async function configureCategoryIndexLoader({
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

		logger.info("Configuring Meilisearch category index...")

		// Configure category index with custom settings
		// This ensures proper search behavior, ranking rules, and filtering
		await meilisearchService.configureIndex(CATEGORY_INDEX_SETTINGS, "category")

		logger.info("Category index configured successfully")
	} catch (error) {
		// Log error but don't fail startup
		const message = error instanceof Error ? error.message : "Unknown error"
		logger.warn(`Failed to configure Meilisearch category index: ${message}`)
		logger.warn("Category indexing will use default Meilisearch settings")
	}
}
