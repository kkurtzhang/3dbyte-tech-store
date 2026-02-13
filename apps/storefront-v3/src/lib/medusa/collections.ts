import { sdk } from "./client"
import type { StoreCollection, StoreProduct } from "@medusajs/types"

export async function getCollectionByHandle(
  handle: string
): Promise<StoreCollection | null> {
  try {
    const response = await sdk.store.collection.list({
      handle: [handle],
      limit: 1,
      fields: "*,+metadata",
    })

    return response.collections?.[0] || null
  } catch (error) {
    console.warn(`Failed to fetch collection by handle: ${handle}`, error)
    return null
  }
}

export async function getCollections(): Promise<StoreCollection[]> {
  try {
    const response = await sdk.store.collection.list({
      limit: 100,
      fields: "*,+metadata",
    })

    return response.collections || []
  } catch (error) {
    console.warn("Failed to fetch collections", error)
    return []
  }
}

// Get featured collections (first 4 with metadata feature flag)
export async function getFeaturedCollections(limit: number = 4): Promise<StoreCollection[]> {
  try {
    const response = await sdk.store.collection.list({
      limit: 20, // Fetch more to filter
      fields: "*,+metadata",
    })

    const collections = response.collections || []
    
    // Filter collections with featured=true in metadata, or just take first N
    const featured = collections.filter((c) => c.metadata?.featured === "true")
    
    if (featured.length > 0) {
      return featured.slice(0, limit)
    }
    
    // Fallback: return first N collections
    return collections.slice(0, limit)
  } catch (error) {
    console.warn("Failed to fetch featured collections", error)
    return []
  }
}

export async function getProductsByCollection(
  collectionId: string,
  params: {
    page?: number
    limit?: number
  }
): Promise<{ products: StoreProduct[]; count: number }> {
  const { page = 1, limit = 20 } = params

  const { products, count } = await sdk.store.product.list({
    collection_id: [collectionId],
    limit,
    offset: (page - 1) * limit,
    fields: "*variants,*variants.prices",
  })

  return {
    products,
    count,
  }
}
