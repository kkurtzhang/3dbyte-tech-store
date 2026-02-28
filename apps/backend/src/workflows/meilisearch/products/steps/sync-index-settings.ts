import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { MEILISEARCH_MODULE } from "../../../../modules/meilisearch";
import type MeilisearchModuleService from "../../../../modules/meilisearch/service";
import type { MeilisearchIndexSettings } from "@3dbyte-tech-store/shared-types";
import type { Logger, MedusaContainer } from "@medusajs/framework/types";

export type SyncIndexSettingsStepInput = {
  type?: "product" | "category" | "brand";
};

export type SyncIndexSettingsStepOutput = {
  filterableAttributes: string[];
  priceAttributes: string[];
  optionAttributes: string[];
};

/**
 * Core function to sync Meilisearch index settings
 *
 * This function contains the shared logic for syncing settings,
 * which can be used by both workflow steps and scheduled jobs.
 *
 * @param container - Medusa container
 * @param type - Index type to configure
 * @returns Settings sync result
 */
export async function syncIndexSettingsFn(
  container: MedusaContainer,
  type: "product" | "category" | "brand" = "product",
): Promise<SyncIndexSettingsStepOutput> {
  const meilisearchModuleService =
    container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);
  const remoteQuery = container.resolve(
    ContainerRegistrationKeys.REMOTE_QUERY,
  );
  const logger = container.resolve<Logger>("logger");

  logger.info(
    `Starting Meilisearch ${type} index settings sync...`,
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
  const optionAttributes = uniqueTitles
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
    "collection_ids",
    "type_id",
    "on_sale",
    "in_stock",
  ];

  // Combine all filterable attributes
  const filterableAttributes = [
    ...staticAttributes,
    ...priceAttributes,
    ...optionAttributes,
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
      ...optionAttributes,
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
    `Updating ${type} index settings: ${filterableAttributes.length} filterable attributes ` +
      `(${priceAttributes.length} prices, ${optionAttributes.length} options)`,
  );

  // Configure the index with computed settings
  await meilisearchModuleService.configureIndex(settings, type);

  logger.info(
    `${type} index settings sync completed successfully`,
  );

  return {
    filterableAttributes,
    priceAttributes,
    optionAttributes,
  };
}

/**
 * Step to sync Meilisearch index settings with current database state
 *
 * This step ensures that the index settings stay in sync with the database:
 * - New product options become filterable
 * - New regions get price_* attributes added
 * - Removed options/regions are cleaned up
 *
 * Why is this needed as a step?
 * - Can be reused by both scheduled job and manual sync workflows
 * - Ensures consistent behavior across all indexing operations
 * - Allows for rollback/compensation in workflow context
 */
export const syncIndexSettingsStep = createStep(
  "sync-index-settings",
  async (
    { type = "product" }: SyncIndexSettingsStepInput,
    { container },
  ) => {
    const result = await syncIndexSettingsFn(container, type);

    return new StepResponse<SyncIndexSettingsStepOutput>(
      result,
      result,
    );
  },
  // Compensation function for rollback
  // Note: We don't rollback settings changes as they're not destructive
  // and may have been intentionally applied
  async (_compensationData, _context) => {
    // No-op - settings changes are not rolled back
  },
);
