import { sdk } from "./client"
import type { MedusaCollection, MedusaProduct } from "./types"

export async function getCollectionByHandle(
  handle: string
): Promise<MedusaCollection | null> {
  try {
    const response = await sdk.store.collection.list({
      handle: [handle],
      limit: 1,
    })

    return response.collections?.[0] || null
  } catch (error) {
    console.warn(`Failed to fetch collection by handle: ${handle}`, error)
    return null
  }
}

export async function getCollectionsResult(
  limit: number = 100
): Promise<{ collections: MedusaCollection[]; error: boolean }> {
  try {
    const response = await sdk.store.collection.list({
      limit,
    })

    return {
      collections: response.collections || [],
      error: false,
    }
  } catch (error) {
    console.warn("Failed to fetch collections", error)

    return {
      collections: [],
      error: true,
    }
  }
}

export async function getCollections(): Promise<MedusaCollection[]> {
  return (await getCollectionsResult()).collections
}

// Get featured collections (first 4)
export async function getFeaturedCollections(limit: number = 4): Promise<MedusaCollection[]> {
  try {
    const response = await sdk.store.collection.list({
      limit: 20, // Fetch more to filter
    })

    const collections = response.collections || []

    // Return first N collections as featured
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
): Promise<{ products: MedusaProduct[]; count: number }> {
  const { page = 1, limit = 20 } = params

  const { products, count } = await sdk.store.product.list({
    collection_id: [collectionId],
    limit,
    offset: (page - 1) * limit,
    fields: "*variants,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory",
  })

  return {
    products,
    count,
  }
}
