/**
 * Address Data Ingestion Pipeline
 *
 * Downloads OpenAddresses GeoJSON.gz, streams line-by-line,
 * transforms each feature into a MeilisearchAddressDocument,
 * batches into groups, and pushes to a temporary Meilisearch index.
 * After all batches are indexed, performs a zero-downtime swap
 * with the production index.
 *
 * Memory safety: Uses Node.js streams — the full file is never
 * loaded into memory. Only the current batch buffer (~5000 docs)
 * is held in memory at a time.
 *
 * NOTE: Uses require("meilisearch") for ESM/CJS compatibility,
 * matching the pattern in modules/meilisearch/service.ts.
 */

import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import type { Logger } from "@medusajs/framework/types";
import type {
  MeilisearchAddressDocument,
  MeilisearchIndexSettings,
  MeilisearchLocalityDocument,
} from "@3dbyte-tech-store/shared-types";
import {
  ADDRESS_INDEX_SETTINGS,
  LOCALITY_INDEX_SETTINGS,
} from "../../modules/meilisearch/service";
import type {
  OpenAddressFeature,
  AddressPipelineConfig,
  AddressPipelineResult,
} from "./types";
import { validateDownloadUrl } from "./discover";

/** Minimum expected document count for AU countrywide data */
const MIN_EXPECTED_DOCUMENTS = 14_000_000;
const MEILISEARCH_TASK_TIMEOUT_MS = 60 * 60 * 1000;
const MEILISEARCH_TASK_POLL_MS = 1_000;

interface MeilisearchEnqueuedTask {
  taskUid: number;
}

interface MeilisearchCompletedTask {
  uid: number;
  status: string;
  error?: {
    message?: string;
    code?: string;
  };
}

interface MeilisearchTaskClient {
  waitForTask(
    task: MeilisearchEnqueuedTask | number,
    options: { timeout: number; interval: number },
  ): Promise<MeilisearchCompletedTask>;
}

interface MeilisearchIndexClient {
  addDocuments(
    documents: Array<MeilisearchAddressDocument | MeilisearchLocalityDocument>,
    options: { primaryKey: string },
  ): Promise<MeilisearchEnqueuedTask>;
  updateSettings(
    settings: MeilisearchIndexSettings,
  ): Promise<MeilisearchEnqueuedTask>;
  getStats(): Promise<{ numberOfDocuments: number }>;
}

interface MeilisearchClient {
  createIndex(
    indexName: string,
    options: { primaryKey: string },
  ): Promise<MeilisearchEnqueuedTask>;
  index(indexName: string): MeilisearchIndexClient;
  swapIndexes(
    swaps: Array<{ indexes: [string, string]; rename: boolean }>,
  ): Promise<MeilisearchEnqueuedTask>;
  deleteIndex(indexName: string): Promise<MeilisearchEnqueuedTask>;
  tasks: MeilisearchTaskClient;
}

/**
 * Transform an OpenAddresses GeoJSON Feature into a MeilisearchAddressDocument
 *
 * @param feature - GeoJSON Feature from source.geojson.gz
 * @param rowIndex - Row index for fallback ID generation
 * @returns Flattened address document ready for Meilisearch indexing
 */
export function transformFeature(
  feature: OpenAddressFeature,
  rowIndex: number,
): MeilisearchAddressDocument {
  const props = feature.properties;
  const number = props.number?.trim() || "";
  const street = props.street?.trim() || "";
  const unit = props.unit?.trim() || "";
  const suburb = props.city?.trim() || "";
  const state = props.region?.trim() || "";
  const postcode = props.postcode?.trim() || "";

  const streetWithNumber = `${number} ${street}`.trim();
  const fullParts = [unit, streetWithNumber, suburb, state, postcode].filter(
    Boolean,
  );

  return {
    id: props.hash || `au_${rowIndex}`,
    full_address: fullParts.join(", "),
    unit,
    number,
    street,
    suburb,
    state,
    postcode,
    country: "AU",
  };
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function normalizeLocalityIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Extract a unique locality document from an OpenAddresses GeoJSON Feature.
 */
export function extractLocalityDocument(
  feature: OpenAddressFeature,
): MeilisearchLocalityDocument | null {
  const props = feature.properties;
  if (!props) {
    return null;
  }

  const locality = toTitleCase(props.city?.trim() || "");
  const state = props.region?.trim().toUpperCase() || "";
  const postcode = props.postcode?.trim() || "";
  const country = "AU";

  if (!locality || !state || !postcode) {
    return null;
  }

  const idParts = [country, state, postcode, locality].map(
    normalizeLocalityIdPart,
  );

  return {
    id: idParts.join("_"),
    display_name: `${locality}, ${state} ${postcode}`,
    locality,
    state,
    postcode,
    country,
  };
}

/**
 * Return whether an OpenAddresses feature has enough address data to index.
 */
export function isIndexableAddressFeature(
  feature: OpenAddressFeature,
): boolean {
  const props = feature.properties;
  if (!props) {
    return false;
  }

  return Boolean(props.street?.trim() || props.number?.trim());
}

/**
 * Wait for a Meilisearch write task and fail fast if Meilisearch rejects it.
 */
async function waitForMeilisearchTask(
  client: MeilisearchClient,
  task: MeilisearchEnqueuedTask,
  action: string,
  logger: Logger,
): Promise<void> {
  const completedTask = await client.tasks.waitForTask(task, {
    timeout: MEILISEARCH_TASK_TIMEOUT_MS,
    interval: MEILISEARCH_TASK_POLL_MS,
  });

  if (completedTask.status !== "succeeded") {
    const reason = completedTask.error?.message || "Unknown Meilisearch error";
    throw new Error(
      `Meilisearch task ${completedTask.uid} failed while ${action}: ${reason}`,
    );
  }

  logger.info(`Meilisearch task ${completedTask.uid} succeeded: ${action}`);
}

/**
 * Flush a batch of documents to a Meilisearch index
 */
async function flushBatch(
  client: MeilisearchClient,
  index: MeilisearchIndexClient,
  batch: Array<MeilisearchAddressDocument | MeilisearchLocalityDocument>,
  logger: Logger,
  documentType: "address" | "locality",
): Promise<void> {
  const task = await index.addDocuments(batch, { primaryKey: "id" });
  await waitForMeilisearchTask(
    client,
    task,
    `adding ${documentType} documents`,
    logger,
  );
  logger.info(
    `Flushed batch of ${batch.length} ${documentType} documents (task: ${task.taskUid})`,
  );
}

/**
 * Ingest address data from an OpenAddresses GeoJSON.gz file into Meilisearch
 *
 * Pipeline steps:
 *   1. Create a temporary Meilisearch index
 *   2. Configure it with ADDRESS_INDEX_SETTINGS
 *   3. Stream the GeoJSON.gz, transform each feature, batch into groups of 5000
 *   4. Swap temp index with production index (zero downtime)
 *   5. Delete the old index, log health check
 *
 * @param downloadUrl - HTTPS URL to the GeoJSON.gz file
 * @param config - Pipeline configuration (Meilisearch connection, batch size, etc.)
 * @param logger - Logger instance
 * @returns Pipeline result with stats
 */
export async function ingestAddresses(
  downloadUrl: string,
  config: AddressPipelineConfig,
  logger: Logger,
): Promise<AddressPipelineResult> {
  const startTime = Date.now();

  // Use require for ESM module in CommonJS context (matches service.ts pattern)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MeiliSearch } = require("meilisearch");

  // Create a dedicated Meilisearch client for temp index operations
  // (MeilisearchModuleService doesn't support temp indexes or swap)
  const client = new MeiliSearch({
    host: config.meilisearchHost,
    apiKey: config.meilisearchApiKey,
  }) as MeilisearchClient;

  const tempIndexSuffix = Date.now();
  const tempIndexName = `${config.tempIndexPrefix}${tempIndexSuffix}`;
  const localityTempIndexName = `${config.localityTempIndexPrefix}${tempIndexSuffix}`;
  logger.info(`Creating temporary index: ${tempIndexName}`);
  logger.info(`Creating temporary locality index: ${localityTempIndexName}`);

  try {
    // Step 1: Create and configure temp indexes
    const createTask = await client.createIndex(tempIndexName, {
      primaryKey: "id",
    });
    await waitForMeilisearchTask(
      client,
      createTask,
      "creating temp index",
      logger,
    );
    const createLocalityTask = await client.createIndex(localityTempIndexName, {
      primaryKey: "id",
    });
    await waitForMeilisearchTask(
      client,
      createLocalityTask,
      "creating temp locality index",
      logger,
    );

    const tempIndex = client.index(tempIndexName);
    const settingsTask = await tempIndex.updateSettings(ADDRESS_INDEX_SETTINGS);
    await waitForMeilisearchTask(
      client,
      settingsTask,
      "configuring temp index settings",
      logger,
    );
    logger.info(`Temporary index configured with ADDRESS_INDEX_SETTINGS`);

    const localityTempIndex = client.index(localityTempIndexName);
    const localitySettingsTask = await localityTempIndex.updateSettings(
      LOCALITY_INDEX_SETTINGS,
    );
    await waitForMeilisearchTask(
      client,
      localitySettingsTask,
      "configuring temp locality index settings",
      logger,
    );
    logger.info(
      `Temporary locality index configured with LOCALITY_INDEX_SETTINGS`,
    );

    // Step 2: Download and stream GeoJSON.gz
    const safeDownloadUrl = validateDownloadUrl(downloadUrl);
    logger.info(`Downloading GeoJSON.gz from: ${safeDownloadUrl}`);
    const response = await fetch(safeDownloadUrl);
    if (!response.ok) {
      throw new Error(
        `Download failed: ${response.status} ${response.statusText}`,
      );
    }
    if (!response.body) {
      throw new Error("Download response has no body");
    }

    // Convert Web ReadableStream to Node.js Readable for piping
    const nodeStream = Readable.fromWeb(
      response.body as import("node:stream/web").ReadableStream,
    );

    const gunzip = createGunzip();
    const rl = createInterface({
      input: nodeStream.pipe(gunzip),
      crlfDelay: Infinity,
    });

    // Step 3: Stream, transform, batch, flush
    let batch: MeilisearchAddressDocument[] = [];
    let localityBatch: MeilisearchLocalityDocument[] = [];
    let seenLocalityIds = new Set<string>();
    let totalRows = 0;
    let batchesProcessed = 0;
    let localityBatchesProcessed = 0;
    let localityRows = 0;
    let skippedRows = 0;

    for await (const line of rl) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      try {
        const feature: OpenAddressFeature = JSON.parse(trimmedLine);
        const localityDoc = extractLocalityDocument(feature);
        if (localityDoc && !seenLocalityIds.has(localityDoc.id)) {
          seenLocalityIds = new Set([...seenLocalityIds, localityDoc.id]);
          localityBatch = [...localityBatch, localityDoc];
          localityRows++;

          if (localityBatch.length >= config.batchSize) {
            await flushBatch(
              client,
              localityTempIndex,
              localityBatch,
              logger,
              "locality",
            );
            localityBatchesProcessed++;
            localityBatch = [];
          }
        }

        if (!isIndexableAddressFeature(feature)) {
          skippedRows++;
          continue;
        }

        const doc = transformFeature(feature, totalRows);
        batch.push(doc);
        totalRows++;

        // Flush when batch is full
        if (batch.length >= config.batchSize) {
          await flushBatch(client, tempIndex, batch, logger, "address");
          batchesProcessed++;
          batch = [];

          // Progress logging every 100 batches (~500k rows)
          if (batchesProcessed % 100 === 0) {
            logger.info(
              `Progress: ${totalRows.toLocaleString()} rows, ${batchesProcessed} batches`,
            );
          }
        }
      } catch (parseError) {
        // Skip malformed lines — don't crash the whole pipeline
        skippedRows++;
        if (skippedRows <= 10) {
          const msg =
            parseError instanceof Error
              ? parseError.message
              : "Unknown parse error";
          logger.warn(`Skipped malformed line at row ${totalRows}: ${msg}`);
        }
      }
    }

    // Flush remaining documents
    if (batch.length > 0) {
      await flushBatch(client, tempIndex, batch, logger, "address");
      batchesProcessed++;
    }
    if (localityBatch.length > 0) {
      await flushBatch(
        client,
        localityTempIndex,
        localityBatch,
        logger,
        "locality",
      );
      localityBatchesProcessed++;
    }

    logger.info(
      `Streaming complete: ${totalRows.toLocaleString()} rows, ` +
        `${batchesProcessed} address batches, ` +
        `${localityRows.toLocaleString()} localities, ` +
        `${localityBatchesProcessed} locality batches, ` +
        `${skippedRows} skipped`,
    );

    if (totalRows === 0) {
      // Don't swap if no data was ingested — something went wrong
      throw new Error(
        "No address data was ingested. Aborting swap to protect production index.",
      );
    }

    // Step 4: Zero-downtime index swap
    logger.info(
      `Swapping indexes: ${config.addressIndexName} ↔ ${tempIndexName}`,
    );
    logger.info(
      `Swapping locality indexes: ${config.localityIndexName} ↔ ${localityTempIndexName}`,
    );
    const swapTask = await client.swapIndexes([
      { indexes: [config.addressIndexName, tempIndexName], rename: false },
      {
        indexes: [config.localityIndexName, localityTempIndexName],
        rename: false,
      },
    ]);
    await waitForMeilisearchTask(
      client,
      swapTask,
      "swapping address and locality indexes",
      logger,
    );
    logger.info("Index swap completed successfully");

    // Step 5: Delete old indexes (now at temp index names)
    const deleteTask = await client.deleteIndex(tempIndexName);
    await waitForMeilisearchTask(
      client,
      deleteTask,
      "deleting old address index",
      logger,
    );
    logger.info(`Deleted old index: ${tempIndexName}`);
    const deleteLocalityTask = await client.deleteIndex(localityTempIndexName);
    await waitForMeilisearchTask(
      client,
      deleteLocalityTask,
      "deleting old locality index",
      logger,
    );
    logger.info(`Deleted old locality index: ${localityTempIndexName}`);

    // Step 6: Health check — verify document count
    const prodIndex = client.index(config.addressIndexName);
    const stats = await prodIndex.getStats();
    if (stats.numberOfDocuments < MIN_EXPECTED_DOCUMENTS) {
      logger.warn(
        `Address index has fewer documents than expected ` +
          `(${stats.numberOfDocuments.toLocaleString()} < ${MIN_EXPECTED_DOCUMENTS.toLocaleString()}). ` +
          `Data may be incomplete.`,
      );
    } else {
      logger.info(
        `Health check passed: ${stats.numberOfDocuments.toLocaleString()} documents in production index`,
      );
    }

    const durationMs = Date.now() - startTime;
    return {
      totalRows,
      batchesProcessed,
      durationMs,
      indexName: config.addressIndexName,
      localityRows,
      localityIndexName: config.localityIndexName,
    };
  } catch (error) {
    // Cleanup: attempt to delete the temp indexes on failure
    try {
      logger.warn(`Pipeline failed. Cleaning up temp index: ${tempIndexName}`);
      const cleanupTask = await client.deleteIndex(tempIndexName);
      await waitForMeilisearchTask(
        client,
        cleanupTask,
        "cleaning up failed temp address index",
        logger,
      );
      logger.info(`Temp index ${tempIndexName} cleaned up`);
      logger.warn(
        `Pipeline failed. Cleaning up temp locality index: ${localityTempIndexName}`,
      );
      const localityCleanupTask = await client.deleteIndex(
        localityTempIndexName,
      );
      await waitForMeilisearchTask(
        client,
        localityCleanupTask,
        "cleaning up failed temp locality index",
        logger,
      );
      logger.info(`Temp locality index ${localityTempIndexName} cleaned up`);
    } catch (cleanupError) {
      const msg =
        cleanupError instanceof Error
          ? cleanupError.message
          : "Unknown cleanup error";
      logger.warn(
        `Failed to clean up temp indexes ${tempIndexName}/${localityTempIndexName}: ${msg}`,
      );
    }
    throw error;
  }
}
