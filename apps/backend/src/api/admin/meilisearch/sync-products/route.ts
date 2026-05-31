import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MEILISEARCH_MODULE } from "../../../../modules/meilisearch"
import type MeilisearchModuleService from "../../../../modules/meilisearch/service"
import { syncProductsWithSettingsWorkflow } from "../../../../workflows/meilisearch/products/sync-products-with-settings"
import { deleteStaleIndexDocuments } from "../utils/reconcile-index"
import type { Logger } from "@medusajs/framework/types"

/**
 * POST /admin/meilisearch/sync-products
 *
 * Admin API endpoint to manually trigger a full sync of all products to Meilisearch.
 *
 * This endpoint will:
 * - Sync index settings (ensures filterable/sortable attributes are current)
 * - Fetch all published products from Medusa
 * - Fetch enriched content from Strapi (if available)
 * - Index all products to Meilisearch
 * - Delete stale products from Meilisearch
 *
 * Example:
 * POST /admin/meilisearch/sync-products
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> => {
  const logger = req.scope.resolve<Logger>("logger");

  try {
    logger.info("Starting manual Meilisearch sync...");

    let hasMore = true
    let offset = 0
    const limit = 50
    let totalIndexed = 0
    const syncedProductIds: string[] = []
    const meilisearchService =
      req.scope.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

    // Paginated sync following official pattern
    while (hasMore) {
      const { result } = await syncProductsWithSettingsWorkflow(req.scope).run({
        input: {
          filters: {
            status: "published",
          },
          limit,
          offset,
        },
      });

      hasMore = offset + limit < (result.metadata?.count ?? 0)
      offset += limit
      totalIndexed += result.indexed
      syncedProductIds.push(
        ...((result.products ?? []) as Array<{ id?: string }>)
          .map((product) => product.id)
          .filter((id): id is string => Boolean(id)),
      )
    }

    const totalDeleted = await deleteStaleIndexDocuments({
      currentIds: syncedProductIds,
      label: "product",
      logger,
      meilisearchService,
      type: "product",
    })

    logger.info(
      `Meilisearch sync completed: ${totalIndexed} products indexed, ${totalDeleted} stale products deleted`,
    )

    res.json({
      message: "Products synced to Meilisearch successfully",
      indexed: totalIndexed,
      deleted: totalDeleted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to sync products to Meilisearch:", error);
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to sync products to Meilisearch: ${message}`,
    );
  }
};

/**
 * GET /admin/meilisearch/sync-products
 *
 * Returns information about the sync endpoint (for discovery)
 */
export const GET = async (
  _req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> => {
  res.json({
    endpoint: "/admin/meilisearch/sync-products",
    method: "POST",
    description: "Manually trigger a full sync of all products to Meilisearch with up-to-date index settings",
    behavior:
      "Syncs index settings (filterable/sortable attributes) then syncs all published products from Medusa to Meilisearch with Strapi enrichment",
    example: {
      request: "POST /admin/meilisearch/sync-products",
      response: {
        message: "Products synced to Meilisearch successfully",
        indexed: 150,
        deleted: 0,
      },
    },
  });
};
