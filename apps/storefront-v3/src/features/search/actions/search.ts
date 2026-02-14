"use server"

import { searchClient, INDEX_PRODUCTS } from "@/lib/search/client"

interface SearchOptions {
  limit?: number
  categories?: string[] | undefined
  materials?: string[] | undefined
  diameters?: string[] | undefined
  colors?: string[] | undefined
  sizes?: string[] | undefined
  minPrice?: number | undefined
  maxPrice?: number | undefined
  brands?: string[] | undefined
  inStock?: boolean | undefined
}

export async function searchProducts(query: string, options: SearchOptions = {}) {
  const { limit = 20, categories, minPrice, maxPrice, brands, inStock } = options

  try {
    const index = searchClient.index(INDEX_PRODUCTS)

    const filter: string[] = []

    // Use category_ids which is the actual filterable attribute in Meilisearch
    if (categories && categories.length > 0) {
      // Note: category_ids is an array, we filter by exact match
      filter.push(`category_ids IN [${categories.map(c => `"${c}"`).join(", ")}]`)
    }

    // Brand filter - use brand.id
    if (brands && brands.length > 0) {
      filter.push(`brand.id IN [${brands.map(b => `"${b}"`).join(", ")}]`)
    }

    // In stock filter
    if (inStock) {
      filter.push(`in_stock = true`)
    }

    // Note: price, material, diameter, color, size filters are not supported 
    // by current Meilisearch index configuration
    // These can be added later by updating the Meilisearch index settings in the backend

    const result = await index.search(query, {
      limit,
      filter: filter.length > 0 ? filter.join(" AND ") : undefined,
      attributesToRetrieve: ["id", "handle", "title", "thumbnail", "price", "specs"],
    })

    return {
      hits: result.hits,
      estimatedTotalHits: result.estimatedTotalHits,
    }
  } catch (error) {
    console.error("Search failed:", error)
    return { hits: [], estimatedTotalHits: 0 }
  }
}
