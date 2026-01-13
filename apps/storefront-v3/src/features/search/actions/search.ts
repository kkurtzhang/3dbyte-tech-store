"use server"

import { searchClient, INDEX_PRODUCTS } from "@/lib/search/client"

export async function searchProducts(query: string, limit = 20) {
  try {
    const index = searchClient.index(INDEX_PRODUCTS)
    const result = await index.search(query, {
      limit,
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
