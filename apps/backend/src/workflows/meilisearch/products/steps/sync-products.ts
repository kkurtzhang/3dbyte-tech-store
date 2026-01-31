import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { MEILISEARCH_MODULE } from "../../../../modules/meilisearch";
import {
  toMeilisearchDocument,
  type RegionForPricing,
} from "../../../../modules/meilisearch/utils/index";
import type MeilisearchModuleService from "../../../../modules/meilisearch/service";
import type {
  SyncProductsStepProduct,
  StrapiProductDescription,
  MeilisearchProductDocument,
} from "@3dbyte-tech-store/shared-types";
import type { Logger } from "@medusajs/framework/types";

export type SyncProductsStepInput = {
  products: SyncProductsStepProduct[];
  strapiContents?: StrapiProductDescription[];
  optionTitleMap?: Record<string, string>;
};

type SyncProductsStepCompensationData = {
  newProductIds: string[];
  existingProducts: Record<string, unknown>[];
};

export const syncProductsStep = createStep(
  "sync-products",
  async (
    { products, strapiContents = [], optionTitleMap }: SyncProductsStepInput,
    { container },
  ) => {
    const logger = container.resolve<Logger>("logger");

    const meilisearchModuleService =
      container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);
    const remoteQuery = container.resolve(
      ContainerRegistrationKeys.REMOTE_QUERY,
    );

    if (!products || products.length === 0) {
      logger.warn("[syncProductsStep] No products to index");
      return new StepResponse(
        { indexed: 0 },
        { newProductIds: [], existingProducts: [] },
      );
    }

    // Fetch all active regions for multi-currency pricing
    const { data: regions } = await remoteQuery.graph({
      entity: "region",
      fields: ["id", "currency_code"],
    });
    const regionsForPricing: RegionForPricing[] = regions.map((r: unknown) => ({
      id: (r as { id: string }).id,
      currency_code: (r as { currency_code: string }).currency_code,
    }));

    // Retrieve existing products BEFORE indexing (for rollback)
    const existingProducts = await meilisearchModuleService.retrieveFromIndex(
      products.map((product) => product.id),
      "product",
    );

    // Determine which products are new vs existing
    const existingIds = new Set(existingProducts.map((p) => p.id as string));
    const newProductIds = products
      .filter((product) => !existingIds.has(product.id))
      .map((product) => product.id);

    // Create a map of Strapi content by medusa_id for quick lookup
    const strapiContentMap = new Map<string, StrapiProductDescription>(
      strapiContents.map((content) => [content.medusa_product_id, content]),
    );

    // Transform products to Meilisearch documents with regions and Strapi enrichment
    const documents: MeilisearchProductDocument[] = products.map((product) => {
      const strapiContent = strapiContentMap.get(product.id);
      return toMeilisearchDocument(
        product,
        regionsForPricing,
        strapiContent ?? null,
        optionTitleMap,
      );
    });

    logger.info(`[syncProductsStep] Transforming ${documents.length} products to Meilisearch documents`);

    // Index the documents
    await meilisearchModuleService.indexData(
      documents as unknown as Record<string, unknown>[],
      "product",
    );

    logger.info(`[syncProductsStep] Indexed ${documents.length} documents to Meilisearch`);

    return new StepResponse(
      { indexed: documents.length },
      { newProductIds, existingProducts },
    );
  },
  // Compensation function for rollback
  async (compensationData, { container }) => {
    if (!compensationData) {
      return;
    }

    const { newProductIds, existingProducts } =
      compensationData as SyncProductsStepCompensationData;

    const meilisearchModuleService =
      container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);

    // Delete newly added products
    if (newProductIds && newProductIds.length > 0) {
      await meilisearchModuleService.deleteFromIndex(newProductIds, "product");
    }

    // Restore existing products to their original state
    if (existingProducts && existingProducts.length > 0) {
      await meilisearchModuleService.indexData(existingProducts, "product");
    }
  },
);
