import type { LoaderOptions } from "@medusajs/framework/types"
import type { Logger } from "@medusajs/framework/types"
import { ADDRESS_INDEX_SETTINGS, type MeilisearchOptions } from "../service"
import MeilisearchModuleService from "../service"

/**
 * Meilisearch Address Index Configuration Loader
 *
 * Initializes the address index with proper settings on application startup.
 * The address index is used for checkout address autocomplete, sourcing data
 * from OpenAddresses (G-NAF for AU, LINZ for NZ).
 *
 * Why this loader?
 * - Meilisearch auto-creates indexes with default settings when first used
 * - Custom settings (searchable attributes, typo tolerance) must be applied manually
 * - Loader runs once on startup, ensuring consistent configuration
 *
 * @param options - Loader options containing container and module options
 */
export default async function configureAddressIndexLoader({
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

		logger.info("Configuring Meilisearch address index...")

		// Configure address index with autocomplete-optimized settings
		// This ensures proper search behavior for type-ahead checkout
		await meilisearchService.configureIndex(ADDRESS_INDEX_SETTINGS, "address")

		logger.info("Address index configured successfully")
	} catch (error) {
		// Log error but don't fail startup
		const message = error instanceof Error ? error.message : "Unknown error"
		logger.warn(`Failed to configure Meilisearch address index: ${message}`)
		logger.warn("Address indexing will use default Meilisearch settings")
	}
}
