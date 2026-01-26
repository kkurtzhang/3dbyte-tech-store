import type { LoaderOptions } from "@medusajs/framework/types";
import type { Logger } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { MeilisearchIndexSettings } from "@3dbyte-tech-store/shared-types";
import { type MeilisearchOptions } from "../service";
import MeilisearchModuleService from "../service";

/**
 * Meilisearch Product Index Configuration Loader (V3)
 *
 * Dynamically configures the product index settings based on:
 * - Active product options from the database (e.g., Color, Size)
 * - Active regions for multi-currency pricing (price_usd, price_aud)
 *
 * Why this loader?
 * - Option titles are dynamic user data, not hardcoded
 * - New options added in the admin should automatically become filterable
 * - Regions can be added/removed, requiring dynamic price_* attributes
 *
 * Architecture:
 * 1. Scan DB for unique product option titles
 * 2. Scan DB for active region currency codes
 * 3. Build dynamic filterable attributes list
 * 4. Configure Meilisearch index with computed settings
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

    const remoteQuery = container.resolve(
      ContainerRegistrationKeys.REMOTE_QUERY,
    );

    logger.info("Scanning database for product options and regions...");

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
        "detailed_description",
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
      `Configuring product index with ${filterableAttributes.length} filterable attributes: ` +
        `${priceAttributes.length} prices, ${dynamicAttributes.length} options`,
    );

    // Configure the index with computed settings
    await meilisearchService.configureIndex(settings, "product");

    logger.info("Product index configured successfully");
  } catch (error) {
    // Log error but don't fail startup
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.warn(`Failed to configure Meilisearch product index: ${message}`);
    logger.warn("Product indexing will use default Meilisearch settings");
  }
}
