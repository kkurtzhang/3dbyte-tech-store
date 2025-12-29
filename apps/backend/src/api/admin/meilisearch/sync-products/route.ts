import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { syncAllProductsToMeilisearchWorkflow } from "../../../../workflows/meilisearch/sync-all-products-to-meilisearch"

/**
 * POST /admin/meilisearch/sync-products
 *
 * Admin API endpoint to manually trigger a full sync of all products to Meilisearch.
 *
 * This endpoint will:
 * - Fetch all products from Medusa
 * - Fetch enriched content from Strapi (if available)
 * - Index all products to Meilisearch
 *
 * Example:
 * POST /admin/meilisearch/sync-products
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const logger = req.scope.resolve("logger")

  try {
    logger.info("Starting manual Meilisearch sync...")

    // Run the workflow
    const { result } = await syncAllProductsToMeilisearchWorkflow(req.scope).run({
      input: {},
    })

    logger.info(`Meilisearch sync completed: ${result.indexed} products indexed`)

    res.json({
      message: "Products synced to Meilisearch successfully",
      indexed: result.indexed,
    })
  } catch (error) {
    logger.error("Failed to sync products to Meilisearch:", error)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to sync products to Meilisearch: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * GET /admin/meilisearch/sync-products
 *
 * Returns information about the sync endpoint (for discovery)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.json({
    endpoint: "/admin/meilisearch/sync-products",
    method: "POST",
    description: "Manually trigger a full sync of all products to Meilisearch",
    behavior: "Syncs all existing products from Medusa to Meilisearch with Strapi enrichment",
    example: {
      request: "POST /admin/meilisearch/sync-products",
      response: {
        message: "Products synced to Meilisearch successfully",
        indexed: 150,
      },
    },
  })
}
