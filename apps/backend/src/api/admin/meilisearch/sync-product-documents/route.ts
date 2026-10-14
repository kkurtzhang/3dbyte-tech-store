import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { documentKnowledgeDependencies } from "../../../../lib/product-document-knowledge/lifecycle";
import { reconcileProductDocuments } from "../../../../lib/product-document-knowledge/synchronize";
import type { Logger } from "@medusajs/framework/types";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const logger = req.scope.resolve<Logger>("logger");

  try {
    const result = await reconcileProductDocuments(
      documentKnowledgeDependencies(req.scope),
    );

    res.json({
      message: "Product documents synced to Meilisearch successfully",
      ...result,
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
