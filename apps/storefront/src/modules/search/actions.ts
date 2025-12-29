import { safeDecodeURIComponent } from "@lib/util/safe-decode-uri"
import { searchProducts, urlParamsToMeilisearchParams } from "@lib/meilisearch/search"

// Re-export environment variables for compatibility with existing code
export const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
export const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export const PRODUCT_LIMIT = 12

type SearchParams = {
	query?: string
	currency_code?: string
	page?: number
	order?: string
	collection?: string[]
	type?: string[]
	material?: string[]
	price?: string[]
}

export async function search({
	query,
	currency_code,
	page = 1,
	order,
	collection,
	type,
	material,
	price,
}: SearchParams): Promise<{
	results: any[]
	count: number
}> {
	// Build Meilisearch filter from parameters
	const filters: string[] = []

	// Handle collection filter
	if (collection && collection.length > 0) {
		filters.push(collection.map((id) => `collection_ids:${id}`).join(" OR "))
	}

	// Handle type filter
	if (type && type.length > 0) {
		filters.push(type.map((id) => `type_ids:${id}`).join(" OR "))
	}

	// Handle material filter
	if (material && material.length > 0) {
		filters.push(material.map((id) => `material_ids:${id}`).join(" OR "))
	}

	// Handle price range filter
	if (price && price.length > 0) {
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
			filters.push(`(${priceFilters.join(" OR ")})`)
		}
	}

	// Handle sorting
	let sort: string[] | undefined
	if (order) {
		switch (order) {
			case "price_asc":
				sort = ["price:asc"]
				break
			case "price_desc":
				sort = ["price:desc"]
				break
			case "created_at":
				sort = ["created_at:desc"]
				break
			default:
				// Default relevance sorting
				break
		}
	}

	// Search Meilisearch
	const { results, count } = await searchProducts({
		q: query,
		limit: PRODUCT_LIMIT,
		offset: (page - 1) * PRODUCT_LIMIT,
		filter: filters.length > 0 ? filters.join(" AND ") : undefined,
		sort,
	})

	return {
		results,
		count,
	}
}
