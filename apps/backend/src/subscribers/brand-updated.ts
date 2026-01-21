import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { indexBasicBrandWorkflow } from "../workflows/meilisearch/index-basic-brand-workflow"
import { syncBrandToStrapiWorkflow } from "../workflows/meilisearch/sync-brand-to-strapi-workflow"
import { BRAND_MODULE } from "../modules/brand"
import type BrandModuleService from "../modules/brand/service"
import type { SyncBrandsStepBrand } from "@3dbyte-tech-store/shared-types"

/**
 * Brand Updated Event Handler
 *
 * Triggered when a brand is updated in Medusa.
 * Executes two parallel workflows:
 * 1. Workflow A: Index basic brand data to Meilisearch (immediate searchability)
 * 2. Workflow B: Sync brand to Strapi (content enrichment)
 *
 * Retry configs are defined at the step level within each workflow.
 */
export default async function brandUpdatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const brandModuleService: BrandModuleService = container.resolve(BRAND_MODULE)

  try {
    logger.info(`Processing brand.updated event for brand: ${data.id}`)

    // Fetch the full brand data
    const brand = await brandModuleService.retrieveBrand(data.id)

    if (!brand) {
      logger.warn(`Brand ${data.id} not found, skipping sync`)
      return
    }

    const brandData: SyncBrandsStepBrand = {
      id: brand.id,
      name: brand.name,
      handle: brand.handle,
      created_at: typeof brand.created_at === 'string' ? brand.created_at : brand.created_at.toISOString(),
      updated_at: typeof brand.updated_at === 'string' ? brand.updated_at : brand.updated_at.toISOString(),
    }

    // Execute both workflows in parallel
    // Workflow A: Index basic brand data to Meilisearch
    // Workflow B: Sync brand to Strapi for content enrichment
    await Promise.all([
      indexBasicBrandWorkflow(container).run({
        input: { brand: brandData },
      }),
      syncBrandToStrapiWorkflow(container).run({
        input: { brand: brandData },
      }),
    ])

    logger.info(`Successfully processed brand.updated for brand: ${data.id}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    logger.error(`Failed to handle brand.updated event for ${data.id}: ${message}`)
    // Errors are logged; workflows have their own retry mechanisms
  }
}

export const config: SubscriberConfig = {
  event: "brand.updated",
}
