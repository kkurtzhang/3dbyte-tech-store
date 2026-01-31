import type { MedusaContainer } from "@medusajs/framework/types";
import type { Logger } from "@medusajs/framework/types";
import { syncIndexSettingsFn } from "../workflows/meilisearch/products/steps/sync-index-settings";

/**
 * Scheduled job to sync Meilisearch product index settings
 *
 * This job runs daily at 3 AM and ensures the product index settings
 * stay in sync with the database:
 * - New product options become filterable
 * - New regions get price_* attributes added
 * - Removed options/regions are cleaned up
 *
 * Why is this needed?
 * - The loader runs on startup, but options/regions change over time
 * - Settings drift can cause search/filter issues
 * - Regular sync ensures the index matches current data model
 *
 * Architecture:
 * - Uses the shared syncIndexSettingsFn to ensure consistency
 * - Same logic as manual sync, just runs on a schedule
 */
export default async function syncMeilisearchSettingsJob(
  container: MedusaContainer,
) {
  const logger: Logger = container.resolve("logger");

  try {
    logger.info("Starting scheduled Meilisearch settings sync...");

    // Use the shared function to sync settings
    // This ensures consistency with manual sync operations
    await syncIndexSettingsFn(container, "product");

    logger.info("Meilisearch settings sync completed successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Meilisearch settings sync failed: ${message}`);
    throw error;
  }
}

/**
 * Configuration for the scheduled job
 *
 * @property name - Unique identifier for the job
 * @property schedule - Cron expression: "0 3 * * *" (daily at 3 AM)
 */
export const config = {
  name: "sync-meilisearch-settings",
  schedule: "0 3 * * *", // Daily at 3:00 AM
};
