import { sdk } from "./client"
import type { StoreCollection, StoreProduct } from "@medusajs/types"

export async function getCollectionByHandle(
  handle: string
): Promise<StoreCollection | null> {
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

export async function getCollections(): Promise<StoreCollection[]> {
  try {
    const response = await sdk.store.collection.list({
      limit: 100,
    })

    return response.collections || []
  } catch (error) {
    console.warn("Failed to fetch collections", error)
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
