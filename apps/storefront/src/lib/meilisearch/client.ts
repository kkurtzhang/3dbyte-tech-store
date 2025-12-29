/**
 * Meilisearch Client Configuration
 *
 * Configures the InstantSearch client for connecting to Meilisearch.
 * Uses a search-only API key for secure public access.
 */

import { instantMeiliSearch } from "@meilisearch/instant-meilisearch"
import MeiliSearch from "meilisearch"

// Default Meilisearch configuration
const MEILISEARCH_HOST =
	process.env.NEXT_PUBLIC_MEILISEARCH_HOST || "http://localhost:7700"
const MEILISEARCH_API_KEY =
	process.env.NEXT_PUBLIC_MEILISEARCH_API_KEY || ""
const MEILISEARCH_INDEX_NAME =
	process.env.NEXT_PUBLIC_MEILISEARCH_INDEX_NAME || "products"

/**
 * Create and configure the InstantSearch client for Meilisearch
 *
 * This client is used by React InstantSearch components to query
 * Meilisearch directly from the browser.
 *
 * The instantMeiliSearch function returns an object with a searchClient property
 * that is compatible with react-instantsearch v7.
 */
const instantMeiliSearchClient = instantMeiliSearch(
	MEILISEARCH_HOST,
	MEILISEARCH_API_KEY
)

// Extract the actual searchClient that react-instantsearch expects
export const searchClient = instantMeiliSearchClient.searchClient

/**
 * Direct Meilisearch client for server-side and non-InstantSearch operations
 *
 * This client can be used for:
 * - Server-side data fetching
 * - Direct API calls (getDocument, search, etc.)
 * - Background jobs and workflows
 */
export const meilisearchClient = new MeiliSearch({
	host: MEILISEARCH_HOST,
	apiKey: MEILISEARCH_API_KEY,
})

/**
 * Export the index name for use in components
 */
export const PRODUCTS_INDEX = MEILISEARCH_INDEX_NAME

/**
 * Export the host URL for direct API calls if needed
 */
export const MEILISEARCH_HOST_URL = MEILISEARCH_HOST

/**
 * Type-safe search client for TypeScript components
 */
export type SearchClient = typeof searchClient
