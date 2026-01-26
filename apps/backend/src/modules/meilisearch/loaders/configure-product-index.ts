import type { LoaderOptions } from "@medusajs/framework/types";
import type { Logger } from "@medusajs/framework/types";
import type { MeilisearchIndexSettings } from "@3dbyte-tech-store/shared-types";
import { type MeilisearchOptions } from "../service";
import MeilisearchModuleService from "../service";

/**
 * Meilisearch Product Index Configuration Loader (V3)
 *
 * Configures the product index with base settings on startup.
 *
 * Why static settings here?
 * - Loaders run early in Medusa lifecycle, before Query/remoteQuery are available
 * - Dynamic settings (options, regions) are synced by scheduled job at 3 AM
 * - This ensures the index has valid settings even if the job hasn't run yet
 *
 * Architecture:
 * 1. Apply static filterable/sortable/searchable attributes
 * 2. Scheduled job (sync-meilisearch-settings) adds dynamic attributes later
 *
 * @param loaderOptions - Loader options containing container and module options
 */
export default async function configureProductIndexLoader({
  container,
  options: loaderOptions,
}: LoaderOptions): Promise<void> {
  const logger: Logger = container.resolve("logger");

  try {
    // Module options are required for Meilisearch service initialization
    if (!loaderOptions) {
      throw new Error("Meilisearch module options are required");
    }

    // Create a new instance of the Meilisearch service
    const meilisearchService = new MeilisearchModuleService(
      { logger },
      loaderOptions as MeilisearchOptions,
    );

    logger.info("Configuring Meilisearch product index with base settings...");

    // Static attributes that are always filterable
    // Dynamic attributes (options_*, price_*) added by scheduled job
    const staticAttributes: string[] = [
      "id",
      "handle",
      "brand.id",
      "category_ids",
      "type_id",
      "on_sale",
      "in_stock",
    ];

    // Build the base settings object
    // Note: Price and option attributes will be added dynamically by scheduled job
    const settings: MeilisearchIndexSettings = {
      filterableAttributes: staticAttributes,
      searchableAttributes: [
        "title",
        "rich_description",
        "variants.sku",
        "variants.title",
      ],
      sortableAttributes: ["created_at_timestamp"],
      displayedAttributes: [
        "id",
        "title",
        "handle",
        "thumbnail",
        "brand",
        "on_sale",
        "in_stock",
        "inventory_quantity",
        "categories",
        "_tags",
        "collection_ids",
        "type_id",
        "created_at_timestamp",
        "variants",
      ],
      rankingRules: [
        "words",
        "typo",
        "proximity",
        "attribute",
        "sort",
        "exactness",
      ],
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 4,
          twoTypos: 8,
        },
      },
      faceting: {
        maxValuesPerFacet: 100,
      },
      pagination: {
        maxTotalHits: 10000,
      },
    };

    logger.info(
      `Configuring product index with ${staticAttributes.length} base filterable attributes`,
    );

    // Configure the index with base settings
    await meilisearchService.configureIndex(settings, "product");

    logger.info(
      "Product index configured with base settings. Dynamic attributes will be added by scheduled job.",
    );
  } catch (error) {
    // Log error but don't fail startup
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.warn(`Failed to configure Meilisearch product index: ${message}`);
    logger.warn("Product indexing will use default Meilisearch settings");
  }
}
