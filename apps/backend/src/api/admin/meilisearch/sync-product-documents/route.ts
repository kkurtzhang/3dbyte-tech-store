import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { MEILISEARCH_MODULE } from "../../../../modules/meilisearch";
import {
  default as MeilisearchModuleService,
  PRODUCT_DOCUMENT_INDEX_SETTINGS,
} from "../../../../modules/meilisearch/service";
import {
  STRAPI_MODULE,
  StrapiModuleService,
} from "../../../../modules/strapi";
import { toPublicProductDocumentSearchDocument } from "../../../../modules/product-files/utils/public-documents";
import type { Logger } from "@medusajs/framework/types";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const logger = req.scope.resolve<Logger>("logger");

  try {
    const strapiService: StrapiModuleService = req.scope.resolve(STRAPI_MODULE);
    const meilisearchService =
      req.scope.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);
    const documents = await strapiService.listProductDocuments();
    const searchDocuments = documents.map(toPublicProductDocumentSearchDocument);
    const indexDocuments: Record<string, unknown>[] = searchDocuments.map(
      (document) => ({ ...document }),
    );

    await meilisearchService.configureIndex(
      PRODUCT_DOCUMENT_INDEX_SETTINGS,
      "product_document",
    );

    if (indexDocuments.length > 0) {
      await meilisearchService.indexData(indexDocuments, "product_document");
    }

    res.json({
      message: "Product documents synced to Meilisearch successfully",
      indexed: searchDocuments.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to sync product documents to Meilisearch:", error);
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to sync product documents to Meilisearch: ${message}`,
    );
  }
}
