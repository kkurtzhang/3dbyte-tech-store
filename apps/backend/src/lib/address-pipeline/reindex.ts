import type { Logger, MedusaContainer } from "@medusajs/framework/types";

import { discoverLatestDownloadUrl } from "./discover";
import { ingestAddresses } from "./ingest";
import type {
  AddressPipelineConfig,
  AddressPipelineResult,
  DiscoveryResult,
} from "./types";

const DEFAULT_ADDRESS_SYNC_BATCH_SIZE = 50_000;

export type AddressReindexTrigger = "scheduled" | "manual";

export type AddressReindexRunResult = {
  trigger: AddressReindexTrigger;
  discovery: DiscoveryResult;
  result: AddressPipelineResult;
};

type AddressReindexEnv = Record<string, string | undefined>;

export function isAddressReindexEnabled(
  trigger: AddressReindexTrigger,
  env: AddressReindexEnv = process.env,
): boolean {
  if (env.ADDRESS_REINDEX_ENABLED === "true") {
    return true;
  }

  return (
    trigger === "manual" && env.ADDRESS_MANUAL_REINDEX_ENABLED === "true"
  );
}

export function buildAddressPipelineConfig(
  env: AddressReindexEnv = process.env,
): AddressPipelineConfig {
  return {
    batchSize: Number(
      env.ADDRESS_SYNC_BATCH_SIZE || DEFAULT_ADDRESS_SYNC_BATCH_SIZE,
    ),
    tempIndexPrefix: "addresses_tmp_",
    localityTempIndexPrefix: "localities_tmp_",
    meilisearchHost: env.MEILISEARCH_HOST || "http://localhost:7700",
    meilisearchApiKey: env.MEILISEARCH_API_KEY || "",
    addressIndexName: env.MEILISEARCH_ADDRESS_INDEX_NAME || "addresses",
    localityIndexName: env.MEILISEARCH_LOCALITY_INDEX_NAME || "localities",
  };
}

export async function runAddressReindex(
  container: MedusaContainer,
  { trigger }: { trigger: AddressReindexTrigger },
): Promise<AddressReindexRunResult> {
  const logger: Logger = container.resolve("logger");

  if (!isAddressReindexEnabled(trigger)) {
    throw new Error(`Address reindex ${trigger} trigger is disabled`);
  }

  logger.info(`Starting ${trigger} address data sync...`);

  const discovery = await discoverLatestDownloadUrl();

  if (discovery.jobId > 0) {
    logger.info(
      `Discovered OpenAddresses job ${discovery.jobId} ` +
        `(${discovery.expectedCount.toLocaleString()} expected rows): ` +
        discovery.downloadUrl,
    );
  } else {
    logger.info(`Using override download URL: ${discovery.downloadUrl}`);
  }

  const result = await ingestAddresses(
    discovery.downloadUrl,
    buildAddressPipelineConfig(),
    logger,
  );

  logger.info(
    `Address sync completed: ${result.totalRows.toLocaleString()} rows, ` +
      `${result.localityRows.toLocaleString()} localities, ` +
      `${result.batchesProcessed} batches, ` +
      `${(result.durationMs / 1000).toFixed(1)}s`,
  );

  return {
    trigger,
    discovery,
    result,
  };
}
