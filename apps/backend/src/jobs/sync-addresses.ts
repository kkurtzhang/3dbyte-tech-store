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
 *   - MEILISEARCH_HOST: Meilisearch server URL
 *   - MEILISEARCH_API_KEY: Meilisearch API key
 *   - MEILISEARCH_ADDRESS_INDEX_NAME: Production index name (default: "addresses")
 *   - OPENADDRESSES_API_TOKEN: Optional API token for OpenAddresses batch API
 *   - OPENADDRESSES_DOWNLOAD_URL: Optional override for the download URL
 */

import type { MedusaContainer } from "@medusajs/framework/types";
import type { Logger } from "@medusajs/framework/types";
import { discoverLatestDownloadUrl } from "../lib/address-pipeline/discover";
import { ingestAddresses } from "../lib/address-pipeline/ingest";
import type { AddressPipelineConfig } from "../lib/address-pipeline/types";

export default async function syncAddressesJob(
  container: MedusaContainer
): Promise<void> {
  const logger: Logger = container.resolve("logger");

  try {
    logger.info("Starting scheduled address data sync...");

    // Step 1: Discover latest download URL
    const { downloadUrl, jobId, expectedCount } =
      await discoverLatestDownloadUrl();

    if (jobId > 0) {
      logger.info(
        `Discovered OpenAddresses job ${jobId} ` +
          `(${expectedCount.toLocaleString()} expected rows): ${downloadUrl}`
      );
    } else {
      logger.info(`Using override download URL: ${downloadUrl}`);
    }

    // Step 2: Build pipeline config from environment
    const config: AddressPipelineConfig = {
      batchSize: 5000,
      tempIndexPrefix: "addresses_tmp_",
      meilisearchHost:
        process.env.MEILISEARCH_HOST || "http://localhost:7700",
      meilisearchApiKey: process.env.MEILISEARCH_API_KEY || "",
      addressIndexName:
        process.env.MEILISEARCH_ADDRESS_INDEX_NAME || "addresses",
    };

    // Step 3: Run the ingestion pipeline
    const result = await ingestAddresses(downloadUrl, config, logger);

    logger.info(
      `Address sync completed: ${result.totalRows.toLocaleString()} rows, ` +
        `${result.batchesProcessed} batches, ` +
        `${(result.durationMs / 1000).toFixed(1)}s`
    );
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
