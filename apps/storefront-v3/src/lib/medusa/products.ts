import { sdk } from "./client"
import { StoreProduct } from "@medusajs/types"

export async function getProducts(params: {
  page?: number
  limit?: number
  category_id?: string[]
  collection_id?: string[]
  q?: string
}): Promise<{ products: StoreProduct[]; count: number }> {
  const { page = 1, limit = 20, category_id, collection_id, q } = params

  const { products, count } = await sdk.store.product.list({
    limit,
    offset: (page - 1) * limit,
    category_id,
    collection_id,
    q,
    fields: "*variants,*variants.prices",
  })

  return {
    products,
    count,
  }
}

export async function getProductByHandle(handle: string): Promise<StoreProduct | null> {
  try {
    const { products } = await sdk.store.product.list({
      handle,
      limit: 1,
      fields: "*variants,*variants.prices,*options,*options.values,*images,*type,*collection,*tags",
    })

    return products[0] || null
  } catch (error) {
    console.warn(`Failed to fetch product by handle: ${handle}`, error)
    return null
  }
}

export async function getProductHandles(): Promise<string[]> {
  try {
    const { products } = await sdk.store.product.list({
      limit: 100, // Reasonable limit for SSG
      fields: "handle",
    })

    return products.map((p) => p.handle)
  } catch (error) {
    console.warn("Failed to fetch product handles for SSG", error)
    return []
  }
}

/**
 * Get product counts for each category.
 * Returns a map of category_id to product count.
 */
export async function getCategoryProductCounts(
  categoryIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()

  // Fetch counts in parallel for all categories
  const results = await Promise.allSettled(
    categoryIds.map((categoryId) =>
      sdk.store.product.list({
        category_id: [categoryId],
        limit: 1, // Only need count, not actual products
        fields: "id",
      })
    )
  )

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      counts.set(categoryIds[index], result.value.count)
    } else {
      console.warn(`Failed to fetch count for category ${categoryIds[index]}`)
      counts.set(categoryIds[index], 0)
    }
  })

  return counts
}

/**
 * Get product counts for each collection.
 * Returns a map of collection_id to product count.
 */
export async function getCollectionProductCounts(
  collectionIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()

  // Fetch counts in parallel for all collections
  const results = await Promise.allSettled(
    collectionIds.map((collectionId) =>
      sdk.store.product.list({
        collection_id: [collectionId],
        limit: 1, // Only need count, not actual products
        fields: "id",
      })
    )
  )

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      counts.set(collectionIds[index], result.value.count)
    } else {
      console.warn(`Failed to fetch count for collection ${collectionIds[index]}`)
      counts.set(collectionIds[index], 0)
    }
  })

  return counts
}
