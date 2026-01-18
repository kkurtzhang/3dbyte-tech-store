import { MedusaContainer } from "@medusajs/framework/types";
import { syncCategoriesWorkflow } from "../workflows/meilisearch/sync-categories";

/**
 * Scheduled job to sync categories to Meilisearch
 *
 * This job runs daily at 2 AM and ensures all categories are properly
 * synchronized with the Meilisearch index, providing fresh search data
 * for the storefront.
 *
 * The workflow handles:
 * - Fetching active categories from Medusa
 * - Computing category hierarchy paths
 * - Calculating product counts for each category
 * - Indexing categories to Meilisearch
 * - Cleaning up any inactive entries
 */
export default async function syncCategoriesScheduledJob(container: MedusaContainer) {
  const logger = container.resolve("logger");

  try {
    logger.info("Starting scheduled category sync to Meilisearch");

    // Execute the sync categories workflow
    // The workflow internally filters for active categories
    const { result } = await syncCategoriesWorkflow(container).run({
      input: {},
    });

    // Log the results of the sync operation
    logger.info(
      `Category sync completed successfully - Indexed: ${result.indexed}, Deleted: ${result.deleted}, Total: ${result.total}`
    );
  } catch (error) {
    logger.error("Category sync failed", error);
    throw error;
  }
}

/**
 * Configuration for the scheduled job
 *
 * @property name - Unique identifier for the job
 * @property schedule - Cron expression: "0 2 * * *" (daily at 2 AM)
 * @property numberOfExecutions - Optional: Number of executions before removal (not set for continuous execution)
 */
export const config = {
  name: "sync-categories-to-meilisearch",
  schedule: "0 2 * * *", // Daily at 2:00 AM
  // numberOfExecutions is optional - when not set, the job runs indefinitely
};