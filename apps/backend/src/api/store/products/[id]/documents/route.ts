import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { Logger } from "@medusajs/framework/types";
import {
  STRAPI_MODULE,
  StrapiModuleService,
} from "../../../../../modules/strapi";
import { toPublicProductDocumentSearchDocument } from "../../../../../modules/product-files/utils/public-documents";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const strapiService: StrapiModuleService = req.scope.resolve(STRAPI_MODULE);
  const logger = req.scope.resolve<Logger>("logger");

  try {
    const publicDocuments = await strapiService.listProductDocuments(
      req.params.id as string,
      { failSoft: true },
    );
    const documents = publicDocuments.map(toPublicProductDocumentSearchDocument);

    res.json({ documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.warn(
      `Failed to load public product documents for ${req.params.id}: ${message}`,
    );
    res.json({ documents: [] });
  }
}
