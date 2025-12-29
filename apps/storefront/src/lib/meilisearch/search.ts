/**
 * Meilisearch Helper Functions
 *
 * Utility functions for interacting with Meilisearch directly
 * outside of the InstantSearch components.
 */

import type {
	MeilisearchProductDocument,
	MeilisearchSearchResponse,
} from "@3dbyte-tech-store/shared-types"
import { meilisearchClient, PRODUCTS_INDEX } from "./client"

/**
 * Search parameters
 */
export interface SearchParams {
	q?: string
	limit?: number
	offset?: number
	filter?: string | string[]
	sort?: string[]
	facets?: string[]
}

/**
 * Search products in Meilisearch
 *
 * @param params - Search parameters including query, filters, sorting
 * @returns Search results with products and metadata
 */
export async function searchProducts(
	params: SearchParams = {}
): Promise<{
	results: MeilisearchProductDocument[]
	count: number
}> {
	const {
		q = "",
		limit = 20,
		offset = 0,
		filter,
		sort,
		facets,
	} = params

	try {
		const index = meilisearchClient.index(PRODUCTS_INDEX)

		const searchParams: Record<string, unknown> = {
			limit,
			offset,
			query: q,
		}

		if (filter) {
			searchParams.filter = filter
		}

		if (sort) {
			searchParams.sort = sort
		}

		if (facets) {
			searchParams.facets = facets
		}

		const results = await index.search(q, searchParams)

		return {
			results: results.hits as MeilisearchProductDocument[],
			count: results.estimatedTotalHits || 0,
		}
	} catch (error) {
		console.error("Meilisearch search error:", error)
		// Return empty results on error
		return {
			results: [],
			count: 0,
		}
	}
}

/**
 * Get product by ID from Meilisearch
 *
 * @param id - Product ID
 * @returns Product document or null
 */
export async function getProductById(
	id: string
): Promise<MeilisearchProductDocument | null> {
	try {
		const index = meilisearchClient.index(PRODUCTS_INDEX)
		const document = await index.getDocument(id)
		return document as MeilisearchProductDocument
	} catch (error) {
		console.error(`Failed to get product ${id}:`, error)
		return null
	}
}

/**
 * Get facet distribution from search results
 *
 * @param params - Search parameters
 * @returns Facet distribution
 */
export async function getFacets(
	params: SearchParams = {}
): Promise<Record<string, Record<string, number>>> {
	const { q = "", facets = ["categories", "tags", "price"] } = params

	try {
		const index = meilisearchClient.index(PRODUCTS_INDEX)
		const results = await index.search(q, {
			facets,
			limit: 0, // We only want facet counts, not results
		})

		return results.facetDistribution || {}
	} catch (error) {
		console.error("Failed to get facets:", error)
		return {}
	}
}

/**
 * Convert URL search params to Meilisearch search params
 *
 * @param searchParams - URLSearchParams from the request
 * @returns Meilisearch search parameters
 */
export function urlParamsToMeilisearchParams(
	searchParams: URLSearchParams
): SearchParams {
	const params: SearchParams = {}

	if (searchParams.has("q")) {
		params.q = searchParams.get("q") || undefined
	}

	if (searchParams.has("page")) {
		const page = Number.parseInt(searchParams.get("page") || "1", 10)
		params.offset = (page - 1) * 20 // Assuming 20 per page
	}

	if (searchParams.has("limit")) {
		params.limit = Number.parseInt(searchParams.get("limit") || "20", 10)
	}

	// Handle collection filter
	const collection = searchParams.get("collection")
	if (collection) {
		params.filter = `collection_ids:${collection}`
	}

	// Handle type filter
	const type = searchParams.get("type")
	if (type) {
		const collectionFilter = params.filter || ""
		params.filter = collectionFilter
			? `${collectionFilter} AND type_ids:${type}`
			: `type_ids:${type}`
	}

	// Handle price range filter
	const price = searchParams.get("price")
	if (price) {
		// Price ranges: under-100, 100-500, 501-1000, more-than-1000
		const priceFilters: string[] = []
		if (price.includes("under-100")) {
			priceFilters.push("price <= 100")
		}
		if (price.includes("100-500")) {
			priceFilters.push("price 100 TO 500")
		}
		if (price.includes("501-1000")) {
			priceFilters.push("price 501 TO 1000")
		}
		if (price.includes("more-than-1000")) {
			priceFilters.push("price >= 1000")
		}

		if (priceFilters.length > 0) {
			const existingFilter = params.filter || ""
			params.filter = existingFilter
				? `${existingFilter} AND (${priceFilters.join(" OR ")})`
				: priceFilters.join(" OR ")
		}
	}

	// Handle sorting
	const sortBy = searchParams.get("sortBy")
	if (sortBy) {
		switch (sortBy) {
			case "price_asc":
				params.sort = ["price:asc"]
				break
			case "price_desc":
				params.sort = ["price:desc"]
				break
			case "created_at":
				params.sort = ["created_at:desc"]
				break
			case "relevance":
			default:
				// Default relevance sorting
				break
		}
	}

	return params
}
