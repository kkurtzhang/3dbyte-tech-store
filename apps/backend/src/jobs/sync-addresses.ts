/**
 * Scheduled Job: Sync Addresses to Meilisearch
 *
 * Monthly job that discovers the latest AU countrywide address data
 * from OpenAddresses, ingests it into Meilisearch via the data pipeline,
 * and performs a zero-downtime index swap.
 *
 * Schedule: 1st of each month at 4:00 AM
 * (avoids conflict with 2 AM category sync and 3 AM settings sync)
 *
 * Environment variables:
 *   - ADDRESS_REINDEX_ENABLED: Must be "true" to run the shared address reindex
 *   - MEILISEARCH_HOST: Meilisearch server URL
 *   - MEILISEARCH_BACKEND_API_KEY: backend-scoped Meilisearch key
 *   - MEILISEARCH_ADDRESS_INDEX_NAME: Production index name (default: "addresses")
 *   - MEILISEARCH_LOCALITY_INDEX_NAME: Locality index name (default: "localities")
 *   - OPENADDRESSES_API_TOKEN: Optional API token for OpenAddresses batch API
 *   - OPENADDRESSES_DOWNLOAD_URL: Optional override for the download URL
 */

import type { MedusaContainer } from "@medusajs/framework/types";
import type { Logger } from "@medusajs/framework/types";
import {
  isAddressReindexEnabled,
  runAddressReindex,
} from "../lib/address-pipeline/reindex";

export default async function syncAddressesJob(
  container: MedusaContainer,
): Promise<void> {
  const logger: Logger = container.resolve("logger");

  try {
    if (!isAddressReindexEnabled("scheduled")) {
      logger.info("Address reindex disabled for this environment; skipping");
      return;
    }

    await runAddressReindex(container, { trigger: "scheduled" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Address sync failed: ${message}`);
    throw error;
  }
}

/**
 * Configuration for the scheduled job
 *
 * @property name - Unique identifier for the job
 * @property schedule - Cron expression: "0 4 1 * *" (1st of month at 4 AM)
 */
export const config = {
  name: "sync-addresses-to-meilisearch",
  schedule: "0 4 1 * *",
};
