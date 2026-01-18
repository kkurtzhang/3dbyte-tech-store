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
  // Access logger through container using standard logging pattern
  const logger = container.resolve("logger");

  try {
    console.log("Starting scheduled category sync to Meilisearch");

    // Execute the sync categories workflow with default parameters
    // This will fetch all active categories without pagination
    const { result } = await syncCategoriesWorkflow(container).run({
      input: {
        filters: {
          // Only sync active, non-internal categories that haven't been deleted
          is_active: true,
          is_internal: false,
          deleted_at: null,
        },
      },
    });

    // Log the results of the sync operation
    console.log(
      `Category sync completed successfully - Indexed: ${result.indexed}, Deleted: ${result.deleted}, Total: ${result.total}`
    );

    // Log metadata if available
    if (result.metadata) {
      console.debug(
        `Sync metadata - Total count: ${result.metadata.count}, Skipped: ${result.metadata.skip}, Limit: ${result.metadata.take}`
      );
    }

  } catch (error) {
    console.error("Category sync failed", error);

    // Re-throw the error to ensure the job is marked as failed
    // in the Medusa job system for proper retry handling
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