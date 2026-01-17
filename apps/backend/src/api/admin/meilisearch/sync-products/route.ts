import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { syncProductsWorkflow } from "../../../../workflows/meilisearch/sync-products"
import type { Logger } from "@medusajs/framework/types"

/**
 * POST /admin/meilisearch/sync-products
 *
 * Admin API endpoint to manually trigger a full sync of all products to Meilisearch.
 *
 * This endpoint will:
 * - Fetch all published products from Medusa
 * - Fetch enriched content from Strapi (if available)
 * - Index all products to Meilisearch
 * - Delete unpublished products from Meilisearch
 *
 * Example:
 * POST /admin/meilisearch/sync-products
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const logger = req.scope.resolve<Logger>("logger")

  try {
    logger.info("Starting manual Meilisearch sync...")

    let hasMore = true
    let offset = 0
    const limit = 50
    let totalIndexed = 0

    // Paginated sync following official pattern
    while (hasMore) {
      const { result } = await syncProductsWorkflow(req.scope).run({
        input: {
          filters: {
            status: "published",
          },
          limit,
          offset,
        },
      })

      hasMore = offset + limit < (result.metadata?.count ?? 0)
      offset += limit
      totalIndexed += result.indexed
    }

    logger.info(`Meilisearch sync completed: ${totalIndexed} products indexed`)

    res.json({
      message: "Products synced to Meilisearch successfully",
      indexed: totalIndexed,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    logger.error("Failed to sync products to Meilisearch:", error)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to sync products to Meilisearch: ${message}`
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
    behavior: "Syncs all published products from Medusa to Meilisearch with Strapi enrichment",
    example: {
      request: "POST /admin/meilisearch/sync-products",
      response: {
        message: "Products synced to Meilisearch successfully",
        indexed: 150,
      },
    },
  })
}
