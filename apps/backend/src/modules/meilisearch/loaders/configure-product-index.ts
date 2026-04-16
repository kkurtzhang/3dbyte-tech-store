import type { LoaderOptions } from "@medusajs/framework/types";
import type { Logger } from "@medusajs/framework/types";
import type { MeilisearchIndexSettings } from "@3dbyte-tech-store/shared-types";
import { type MeilisearchOptions } from "../service";
import MeilisearchModuleService from "../service";

export function buildProductIndexSettings(
  existingSettings: MeilisearchIndexSettings | null = null,
): MeilisearchIndexSettings {
  const staticFilterable: string[] = [
    "id",
    "handle",
    "brand.id",
    "category_ids",
    "collection_ids",
    "type_id",
    "on_sale",
    "in_stock",
    "is_bundle",
    "bundle_id",
  ];

  const staticSortable: string[] = ["created_at_timestamp"];

  const staticSearchable: string[] = [
    "title",
    "rich_description",
    "bundle_item_titles",
    "variants.sku",
    "variants.title",
  ];

  const staticDisplayed: string[] = [
    "id",
    "title",
    "handle",
    "thumbnail",
    "brand",
    "is_bundle",
    "bundle_id",
    "bundle_item_count",
    "bundle_item_titles",
    "on_sale",
    "in_stock",
    "inventory_quantity",
    "categories",
    "_tags",
    "collection_ids",
    "type_id",
    "created_at_timestamp",
    "variants",
  ];

  const mergedFilterable = existingSettings?.filterableAttributes
    ? [...new Set([...staticFilterable, ...existingSettings.filterableAttributes])]
    : staticFilterable;

  const mergedSortable = existingSettings?.sortableAttributes
    ? [...new Set([...staticSortable, ...existingSettings.sortableAttributes])]
    : staticSortable;

  const mergedSearchable = existingSettings?.searchableAttributes
    ? [...new Set([...staticSearchable, ...existingSettings.searchableAttributes])]
    : staticSearchable;

  const mergedDisplayed = existingSettings?.displayedAttributes
    ? [...new Set([...staticDisplayed, ...existingSettings.displayedAttributes])]
    : staticDisplayed;

  return {
    filterableAttributes: mergedFilterable,
    searchableAttributes: mergedSearchable,
    sortableAttributes: mergedSortable,
    displayedAttributes: mergedDisplayed,
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
}

/**
 * Meilisearch Product Index Configuration Loader (V3)
 *
 * Configures the product index with base settings on startup.
 *
 * IMPORTANT: Settings Merge Strategy
 * - Fetches existing settings from Meilisearch first
 * - Merges static attributes with existing dynamic attributes (options_*, price_*)
 * - This prevents overwriting dynamic settings added by scheduled jobs
 *
 * Why static settings here?
 * - Loaders run early in Medusa lifecycle, before Query/remoteQuery are available
 * - Dynamic settings (options, regions) are synced by scheduled job at 3 AM
 * - This ensures the index has valid settings even if the job hasn't run yet
 *
 * Architecture:
 * 1. Fetch existing settings (if any)
 * 2. Merge static filterable/sortable/searchable attributes with existing
 * 3. Apply merged settings
 * 4. Scheduled job (sync-meilisearch-settings) adds/updates dynamic attributes later
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

    // Try to fetch existing settings to preserve dynamic attributes
    let existingSettings: MeilisearchIndexSettings | null = null;
    try {
      existingSettings = await meilisearchService.getIndexSettings("product");
      logger.info("Fetched existing Meilisearch settings to preserve dynamic attributes");
    } catch {
      logger.info("No existing settings found, will apply base settings");
    }

    const settings = buildProductIndexSettings(existingSettings);
    const staticFilterableCount = 10;

    logger.info(
      `Configuring product index with ${settings.filterableAttributes?.length || 0} filterable attributes ` +
      `(${staticFilterableCount} static + ${(settings.filterableAttributes?.length || 0) - staticFilterableCount} dynamic)`,
    );

    // Configure the index with merged settings
    await meilisearchService.configureIndex(settings, "product");

    logger.info(
      "Product index configured successfully. Dynamic attributes preserved.",
    );
  } catch (error) {
    // Log error but don't fail startup
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.warn(`Failed to configure Meilisearch product index: ${message}`);
    logger.warn("Product indexing will use default Meilisearch settings");
  }
}
