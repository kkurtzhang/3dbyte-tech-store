import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { syncBrandsWorkflow } from "../../../../workflows/meilisearch/sync-brands"
import type { Logger } from "@medusajs/framework/types"

/**
 * POST /admin/meilisearch/sync-brands
 *
 * Admin API endpoint to manually trigger a full sync of all brands to Meilisearch.
 *
 * This endpoint will:
 * - Fetch all brands from Medusa
 * - Fetch enriched content from Strapi (if available)
 * - Index all brands to Meilisearch
 *
 * Example:
 * POST /admin/meilisearch/sync-brands
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const logger = req.scope.resolve<Logger>("logger")

  try {
    logger.info("Starting manual Meilisearch brand sync...")

    let hasMore = true
    let offset = 0
    const limit = 50
    let totalIndexed = 0

    // Paginated sync following official pattern
    while (hasMore) {
      const { result } = await syncBrandsWorkflow(req.scope).run({
        input: {
          limit,
          offset,
        },
      })

      hasMore = offset + limit < (result.metadata?.count ?? 0)
      offset += limit
      totalIndexed += result.indexed
    }

    logger.info(`Meilisearch brand sync completed: ${totalIndexed} brands indexed`)

    res.json({
      message: "Brands synced to Meilisearch successfully",
      indexed: totalIndexed,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    logger.error("Failed to sync brands to Meilisearch:", error)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to sync brands to Meilisearch: ${message}`
    )
  }
}

/**
 * GET /admin/meilisearch/sync-brands
 *
 * Returns information about the sync endpoint (for discovery)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.json({
    endpoint: "/admin/meilisearch/sync-brands",
    method: "POST",
    description: "Manually trigger a full sync of all brands to Meilisearch",
    behavior: "Syncs all brands from Medusa to Meilisearch with Strapi enrichment",
    example: {
      request: "POST /admin/meilisearch/sync-brands",
      response: {
        message: "Brands synced to Meilisearch successfully",
        indexed: 50,
      },
    },
  })
}
