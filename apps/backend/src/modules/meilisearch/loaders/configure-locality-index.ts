import type { LoaderOptions } from "@medusajs/framework/types";
import type { Logger } from "@medusajs/framework/types";
import { LOCALITY_INDEX_SETTINGS, type MeilisearchOptions } from "../service";
import MeilisearchModuleService from "../service";

/**
 * Meilisearch Locality Index Configuration Loader
 *
 * Initializes the locality index with settings for suburb/postcode lookup.
 */
export default async function configureLocalityIndexLoader({
  container,
  options,
}: LoaderOptions): Promise<void> {
  const logger: Logger = container.resolve("logger");

  try {
    if (!options) {
      throw new Error("Meilisearch module options are required");
    }

    const meilisearchService = new MeilisearchModuleService(
      { logger },
      options as MeilisearchOptions,
    );

    logger.info("Configuring Meilisearch locality index...");
    await meilisearchService.configureIndex(
      LOCALITY_INDEX_SETTINGS,
      "locality",
    );
    logger.info("Locality index configured successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.warn(`Failed to configure Meilisearch locality index: ${message}`);
    logger.warn("Locality indexing will use default Meilisearch settings");
  }
}
