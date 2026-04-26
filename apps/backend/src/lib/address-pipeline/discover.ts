/**
 * OpenAddresses URL Discovery
 *
 * Discovers the latest AU countrywide GeoJSON.gz download URL
 * from the OpenAddresses batch API. Supports env var override
 * for manual URL specification.
 *
 * API flow:
 *   1. GET /api/data?source=au/countrywide&layer=addresses → [{job: 819507, ...}]
 *   2. GET /api/job/819507 → {s3: "s3://v2.openaddresses.io/...", count: 15860127}
 *   3. Convert S3 URL → HTTPS URL
 */

import type { DiscoveryResult } from "./types";

const OA_DATA_API =
  "https://batch.openaddresses.io/api/data?source=au/countrywide&layer=addresses";

/**
 * Convert an S3 URL to an HTTPS URL
 *
 * @example
 *   s3://v2.openaddresses.io/batch-prod/job/819507/source.geojson.gz
 *   → https://v2.openaddresses.io/batch-prod/job/819507/source.geojson.gz
 */
export function s3ToHttps(s3Url: string): string {
  const match = s3Url.match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid S3 URL format: ${s3Url}`);
  }
  const [, bucket, key] = match;
  return validateDownloadUrl(`https://${bucket}/${key}`);
}

/**
 * Validate a discovered or manually configured download URL before fetching it.
 */
export function validateDownloadUrl(downloadUrl: string): string {
  let parsed: URL;

  try {
    parsed = new URL(downloadUrl);
  } catch {
    throw new Error(`Invalid OpenAddresses download URL: ${downloadUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("OpenAddresses download URL must use http or https");
  }

  return parsed.toString();
}

/**
 * Build request headers for OpenAddresses API
 *
 * Includes API token if available in environment variables.
 */
function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = process.env.OPENADDRESSES_API_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Discover the latest OpenAddresses AU countrywide GeoJSON.gz download URL
 *
 * If `OPENADDRESSES_DOWNLOAD_URL` env var is set, uses that directly
 * (skips API discovery). Otherwise queries the batch API to find the
 * latest successful job and constructs the download URL.
 *
 * @returns Discovery result with download URL, job ID, and expected count
 * @throws Error if no data found or API is unreachable
 */
export async function discoverLatestDownloadUrl(): Promise<DiscoveryResult> {
  // Allow env var override for manual URL specification
  const overrideUrl = process.env.OPENADDRESSES_DOWNLOAD_URL;
  if (overrideUrl) {
    return {
      downloadUrl: validateDownloadUrl(overrideUrl),
      jobId: 0,
      expectedCount: 0,
    };
  }

  const headers = buildHeaders();

  // Step 1: Query data API for the latest AU countrywide addresses dataset
  const dataResponse = await fetch(OA_DATA_API, { headers });
  if (!dataResponse.ok) {
    throw new Error(
      `OpenAddresses data API returned ${dataResponse.status}: ${dataResponse.statusText}`
    );
  }

  const dataEntries: Array<{
    id: number;
    job: number;
    source: string;
    layer: string;
    size: number;
  }> = await dataResponse.json();

  if (!Array.isArray(dataEntries) || dataEntries.length === 0) {
    throw new Error(
      "OpenAddresses data API returned no entries for au/countrywide addresses"
    );
  }

  const latestEntry = dataEntries[0];
  const jobId = latestEntry.job;

  if (!jobId) {
    throw new Error(
      `OpenAddresses data entry missing job ID: ${JSON.stringify(latestEntry)}`
    );
  }

  // Step 2: Query job API for download URL and count
  const jobResponse = await fetch(
    `https://batch.openaddresses.io/api/job/${jobId}`,
    { headers }
  );
  if (!jobResponse.ok) {
    throw new Error(
      `OpenAddresses job API returned ${jobResponse.status} for job ${jobId}`
    );
  }

  const job: {
    id: number;
    s3: string;
    count: number;
    status: string;
    source_name: string;
  } = await jobResponse.json();

  if (!job.s3) {
    throw new Error(
      `OpenAddresses job ${jobId} has no S3 URL: ${JSON.stringify(job)}`
    );
  }

  // Step 3: Convert S3 URL to HTTPS
  const downloadUrl = s3ToHttps(job.s3);

  return {
    downloadUrl,
    jobId: job.id,
    expectedCount: job.count || 0,
  };
}
