import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../../modules/meilisearch"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { toMeilisearchDocument } from "../../modules/meilisearch/utils"
import { STRAPI_MODULE } from "../../modules/strapi"
import type MeilisearchModuleService from "../../modules/meilisearch/service"
import type StrapiModuleService from "../../modules/strapi/service"

/**
 * Input for syncing a batch of products to Meilisearch
 */
type SyncProductBatchStepInput = {
  products: any[]
  strapiContents?: Array<any>
}

/**
 * Step to sync a batch of products to Meilisearch
 * This step handles extraction of products from query result and indexing
 */
const syncProductBatchStep = createStep(
  "sync-product-batch-to-meilisearch-step",
  async ({ products, strapiContents = [] }: SyncProductBatchStepInput, { container }) => {
    const meilisearchModuleService: MeilisearchModuleService = container.resolve(MEILISEARCH_MODULE)
    const logger: any = container.resolve("logger")

    if (!products || products.length === 0) {
      logger.info("No products to sync to Meilisearch")
      return new StepResponse({ indexed: 0 }, { productIds: [] })
    }

    // Create a map of Strapi content by medusa_id for quick lookup
    const strapiContentMap = new Map(
      strapiContents.map((content: any) => [content.medusa_product_id, content])
    )

    // Transform products to Meilisearch documents with Strapi enrichment
    const documents = products.map((product: any) => {
      const strapiContent = strapiContentMap.get(product.id)
      return toMeilisearchDocument(product, strapiContent || null)
    })

    // Index the documents
    await meilisearchModuleService.indexData(documents, "product")

    logger.info(`Synced ${documents.length} products to Meilisearch`)

    return new StepResponse(
      { indexed: documents.length },
      { productIds: products.map((p: any) => p.id) }
    )
  },
  async (input, { container }) => {
    // Compensation: Remove products from index if workflow fails
    if (!input || typeof input !== 'object' || !('productIds' in input)) {
      return
    }
    const { productIds } = input as { productIds: string[] }
    if (!productIds || productIds.length === 0) {
      return
    }
    const meilisearchModuleService: MeilisearchModuleService = container.resolve(MEILISEARCH_MODULE)
    await meilisearchModuleService.deleteFromIndex(productIds, "product")
  }
)

/**
 * Step to fetch Strapi content for multiple products
 */
type FetchStrapiContentStepInput = {
  products: any[]
}

const fetchStrapiContentStep = createStep(
  "fetch-strapi-content-step",
  async ({ products }: FetchStrapiContentStepInput, { container }) => {
    const strapiModuleService: StrapiModuleService = container.resolve(STRAPI_MODULE)
    const logger: any = container.resolve("logger")

    const productIds = products.map((p: any) => p.id)

    if (productIds.length === 0) {
      return new StepResponse([])
    }

    try {
      // Fetch all product descriptions from Strapi in parallel
      const descriptions = await Promise.allSettled(
        productIds.map((id) =>
          strapiModuleService
            .getProductDescription(id)
            .catch(() => null) // Return null if individual fetch fails
        )
      )

      // Filter out failed/missing descriptions
      const validDescriptions = descriptions
        .filter((result) => result.status === "fulfilled" && result.value !== null)
        .map((result) => (result as PromiseFulfilledResult<any>).value)

      if (validDescriptions.length > 0) {
        logger.info(
          `Fetched ${validDescriptions.length} Strapi descriptions for ${productIds.length} products`
        )
      }

      return new StepResponse(validDescriptions)
    } catch (error) {
      // If Strapi is completely unavailable, continue without enrichment
      logger.warn(
        `Strapi unavailable during Meilisearch sync: ${error instanceof Error ? error.message : 'Unknown error'}, continuing without enrichment`
      )
      return new StepResponse([])
    }
  }
)

/**
 * Input for the sync all products workflow
 */
type SyncAllProductsToMeilisearchWorkflowInput = {
  batchSize?: number
}

/**
 * Workflow to sync all products to Meilisearch
 *
 * This workflow:
 * 1. Fetches all products from Medusa
 * 2. Fetches enriched content from Strapi (non-blocking)
 * 3. Transforms and indexes products to Meilisearch
 */
export const syncAllProductsToMeilisearchWorkflow = createWorkflow(
  "sync-all-products-to-meilisearch",
  (input: SyncAllProductsToMeilisearchWorkflowInput = {}) => {
    // Step 1: Fetch all published products from Medusa
    // useQueryGraphStep returns { data: products[] }
    const { data: products } = useQueryGraphStep({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "description",
        "thumbnail",
        "status",
        "created_at",
        "updated_at",
        "variants.*",
        "categories.*",
        "tags.*",
      ],
      filters: {
        status: "published", // Only index published products
      },
    })

    // Step 2: Fetch Strapi content for enrichment (non-blocking)
    const strapiContents = fetchStrapiContentStep({ products })

    // Step 3: Sync products to Meilisearch with Strapi enrichment
    const result = syncProductBatchStep({
      products,
      strapiContents,
    })

    return new WorkflowResponse({
      indexed: result.indexed,
    })
  }
)
