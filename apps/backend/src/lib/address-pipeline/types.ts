/**
 * Address Pipeline Types
 *
 * Type definitions for the OpenAddresses data ingestion pipeline.
 * The pipeline downloads GeoJSON.gz files from OpenAddresses,
 * transforms them into Meilisearch documents, and indexes them.
 */

/**
 * GeoJSON Feature from OpenAddresses source.geojson.gz
 *
 * Each line in the GeoJSON Lines file is one Feature object.
 * Field mapping for AU:
 *   - city = suburb
 *   - region = state abbreviation (NSW, VIC, QLD, etc.)
 *   - district = (usually empty for AU)
 */
export interface OpenAddressFeature {
  type: "Feature";
  properties: {
    hash: string;
    number: string;
    street: string;
    unit: string;
    city: string;
    district: string;
    region: string;
    postcode: string;
    id: string;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
}

/**
 * Pipeline configuration
 *
 * All connection details and tuning parameters for the ingestion pipeline.
 * Populated from environment variables in the scheduled job.
 */
export interface AddressPipelineConfig {
  /** Number of documents per Meilisearch batch (default: 5000) */
  batchSize: number;
  /** Prefix for temporary index names (default: "addresses_tmp_") */
  tempIndexPrefix: string;
  /** Meilisearch host URL */
  meilisearchHost: string;
  /** Meilisearch API key */
  meilisearchApiKey: string;
  /** Production address index name */
  addressIndexName: string;
}

/**
 * Pipeline execution result
 *
 * Returned after a successful pipeline run with stats for logging.
 */
export interface AddressPipelineResult {
  /** Total number of address features processed */
  totalRows: number;
  /** Number of batches flushed to Meilisearch */
  batchesProcessed: number;
  /** Total pipeline duration in milliseconds */
  durationMs: number;
  /** Final production index name */
  indexName: string;
}

/**
 * Discovery result from OpenAddresses batch API
 */
export interface DiscoveryResult {
  /** HTTPS download URL for the GeoJSON.gz file */
  downloadUrl: string;
  /** OpenAddresses job ID */
  jobId: number;
  /** Expected number of address features */
  expectedCount: number;
}
