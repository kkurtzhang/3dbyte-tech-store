import type { MedusaContainer } from "@medusajs/framework/types";
import type { Logger } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { MeilisearchIndexSettings } from "@3dbyte-tech-store/shared-types";
import MeilisearchModuleService from "../modules/meilisearch/service";

/**
 * Scheduled job to sync Meilisearch product index settings
 *
 * This job runs daily at 3 AM and ensures the product index settings
 * stay in sync with the database:
 * - New product options become filterable
 * - New regions get price_* attributes added
 * - Removed options/regions are cleaned up
 *
 * Why is this needed?
 * - The loader runs on startup, but options/regions change over time
 * - Settings drift can cause search/filter issues
 * - Regular sync ensures the index matches current data model
 *
 * Architecture:
 * 1. Scan DB for current product options and regions
 * 2. Build new filterable attributes list
 * 3. Update Meilisearch index settings
 */
export default async function syncMeilisearchSettingsJob(
  container: MedusaContainer,
) {
  const logger: Logger = container.resolve("logger");

  try {
    logger.info("Starting scheduled Meilisearch settings sync...");

    // Resolve the Meilisearch module from container
    // The module is already configured with host/api key from medusa-config
    const meilisearchModule = container.resolve("meilisearchModuleService");
    const meilisearchService =
      meilisearchModule as unknown as MeilisearchModuleService;

    const remoteQuery = container.resolve(
      ContainerRegistrationKeys.REMOTE_QUERY,
    );

    // Fetch all unique product option titles
    const { data: productOptions } = await remoteQuery.graph({
      entity: "product_option",
      fields: ["title"],
    });
    const uniqueTitles = [
      ...new Set(
        productOptions.map((o: unknown) => (o as { title: string }).title),
      ),
    ];

    // Normalize option titles to Meilisearch attribute keys
    const dynamicAttributes = uniqueTitles
      .map((title) => `options_${title.toLowerCase().replace(/\s+/g, "_")}`)
      .filter((attr) => attr !== "options_"); // Filter out empty titles

    // Fetch all active regions for price attributes
    const { data: regions } = await remoteQuery.graph({
      entity: "region",
      fields: ["currency_code"],
    });
    const uniqueCurrencies = [
      ...new Set(
        regions.map(
          (r: unknown) => (r as { currency_code: string }).currency_code,
        ),
      ),
    ];
    const priceAttributes = uniqueCurrencies.map(
      (currency) => `price_${currency.toLowerCase()}`,
    );

    // Static attributes that are always filterable
    const staticAttributes: string[] = [
      "id",
      "handle",
      "brand.id",
      "category_ids",
      "type_id",
      "on_sale",
      "in_stock",
    ];

    // Combine all filterable attributes
    const filterableAttributes = [
      ...staticAttributes,
      ...priceAttributes,
      ...dynamicAttributes,
    ];

    // Build the complete settings object
    const settings: MeilisearchIndexSettings = {
      filterableAttributes,
      searchableAttributes: [
        "title",
        "rich_description",
        "variants.sku",
        "variants.title",
      ],
      sortableAttributes: ["created_at_timestamp", ...priceAttributes],
      displayedAttributes: [
        "id",
        "title",
        "handle",
        "thumbnail",
        // Price attributes (dynamic)
        ...priceAttributes,
        // Option attributes (dynamic)
        ...dynamicAttributes,
        "brand",
        "on_sale",
        "in_stock",
        "inventory_quantity",
        "categories",
        "tags",
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
      `Updating product index settings: ${filterableAttributes.length} filterable attributes ` +
        `(${priceAttributes.length} prices, ${dynamicAttributes.length} options)`,
    );

    // Configure the index with computed settings
    await meilisearchService.configureIndex(settings, "product");

    logger.info("Meilisearch settings sync completed successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Meilisearch settings sync failed: ${message}`);
    throw error;
  }
}

/**
 * Configuration for the scheduled job
 *
 * @property name - Unique identifier for the job
 * @property schedule - Cron expression: "0 3 * * *" (daily at 3 AM)
 */
export const config = {
  name: "sync-meilisearch-settings",
  schedule: "0 3 * * *", // Daily at 3:00 AM
};
