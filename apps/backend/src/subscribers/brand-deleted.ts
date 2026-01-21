import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { deleteBrandWorkflow } from "../workflows/meilisearch/delete-brand-workflow"

/**
 * Brand Deleted Event Handler
 *
 * Triggered when a brand is deleted in Medusa.
 * Executes Workflow D: Delete brand from Meilisearch and Strapi.
 *
 * The workflow handles:
 * 1. Immediate deletion from Meilisearch
 * 2. Deletion from Strapi (with retry)
 */
export default async function brandDeletedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  try {
    logger.info(`Processing brand.deleted event for brand: ${data.id}`)

    // Execute Workflow D: Delete from Meilisearch and Strapi
    await deleteBrandWorkflow(container).run({
      input: { brandId: data.id },
    })

    logger.info(`Successfully processed brand.deleted for brand: ${data.id}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    logger.error(`Failed to handle brand.deleted event for ${data.id}: ${message}`)
    // Errors are logged; workflow has its own retry mechanisms
  }
}

export const config: SubscriberConfig = {
  event: "brand.deleted",
}
