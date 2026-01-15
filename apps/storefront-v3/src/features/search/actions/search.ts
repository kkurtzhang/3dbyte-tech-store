"use server"

import { searchClient, INDEX_PRODUCTS } from "@/lib/search/client"

interface SearchOptions {
  limit?: number
  categories?: string[] | undefined
  materials?: string[] | undefined
  diameters?: string[] | undefined
}

export async function searchProducts(query: string, options: SearchOptions = {}) {
  const { limit = 20, categories, materials, diameters } = options

  try {
    const index = searchClient.index(INDEX_PRODUCTS)

    const filter: string[] = []

    if (categories && categories.length > 0) {
      // Meilisearch filter syntax: category IN ["A", "B"]
      filter.push(`category IN [${categories.map(c => `"${c}"`).join(", ")}]`)
    }

    if (materials && materials.length > 0) {
      filter.push(`material IN [${materials.map(m => `"${m}"`).join(", ")}]`)
    }

    if (diameters && diameters.length > 0) {
      filter.push(`diameter IN [${diameters.map(d => `"${d}"`).join(", ")}]`)
    }

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
