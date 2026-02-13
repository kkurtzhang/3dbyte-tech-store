import { sdk } from "./client"
import { StoreProduct } from "@medusajs/types"
import { searchClient, INDEX_PRODUCTS } from "@/lib/search/client"

export async function getProducts(params: {
  page?: number
  limit?: number
  category_id?: string[]
  collection_id?: string[]
  q?: string
  colors?: string[]
  sizes?: string[]
  minPrice?: number
  maxPrice?: number
}): Promise<{ products: StoreProduct[]; count: number }> {
  let products: StoreProduct[] = []
  let count = 0

  try {
    const { page = 1, limit = 20, category_id, collection_id, q } = params

    const { products: fetchedProducts, count: fetchedCount } = await sdk.store.product.list({
      limit,
      offset: (page - 1) * limit,
      category_id,
      collection_id,
      q,
      fields: "*variants,*variants.prices",
    })

    products = fetchedProducts as any
    count = fetchedCount
  } catch (error) {
    console.warn("Medusa SDK failed, falling back to Meilisearch", error)
  }

  // If products array is empty (Medusa failed or no products), fallback
  if (!products || products.length === 0) {
    try {
      const result = await getProductsFromMeilisearch(params)
      products = result.products as any
      count = result.count
    } catch (error) {
      console.warn("Meilisearch also failed, using demo products", error)
      const result = getDemoProducts(params.limit)
      products = result.products as any
      count = result.count
    }
  }

  return { products, count }
}

/**
 * Fallback: Get products from Meilisearch
 * Used when Medusa backend is unavailable
 */
async function getProductsFromMeilisearch(params: {
  limit?: number
  q?: string
  colors?: string[]
  sizes?: string[]
  minPrice?: number
  maxPrice?: number
}): Promise<{ products: StoreProduct[]; count: number }> {
  try {
    const { limit = 4, q, colors, sizes, minPrice, maxPrice } = params

    const filter: string[] = []

    if (q) {
      filter.push(`title ~ ${q}`)
    }

    if (colors && colors.length > 0) {
      filter.push(`color IN [${colors.map(c => `"${c}"`).join(", ")}]`)
    }

    if (sizes && sizes.length > 0) {
      filter.push(`size IN [${sizes.map(s => `"${s}"`).join(", ")}]`)
    }

    if (minPrice !== undefined) {
      filter.push(`price >= ${minPrice}`)
    }

    if (maxPrice !== undefined) {
      filter.push(`price <= ${maxPrice}`)
    }

    const searchParams: any = {
      limit,
      filter: filter.length > 0 ? filter.join(" AND ") : undefined,
    }

    const results = await searchClient.index(INDEX_PRODUCTS).search("", searchParams)

    // Convert Meilisearch hits to StoreProduct format
    const products: StoreProduct[] = results.hits.map((hit: any) => ({
      id: hit.id,
      title: hit.title,
      handle: hit.handle || hit.slug,
      thumbnail: hit.thumbnail || hit.image,
      description: hit.description,
      variants: hit.variants || [],
      options: hit.options || [],
      // Additional fields for ProductCard
      type: hit.type ? { id: "", value: hit.type } : undefined,
      collection: hit.collection,
      tags: hit.tags,
      created_at: hit.created_at,
      updated_at: hit.updated_at,
    })) as unknown as StoreProduct[]

    return { products, count: results.estimatedTotalHits || results.hits.length }
  } catch (error) {
    console.warn("Meilisearch also failed, using demo products", error)
    return (await getDemoProducts(params.limit)) as any
  }
}

/**
 * Demo products fallback
 * Used when both Medusa and Meilisearch are unavailable
 */
export function getDemoProducts(limit = 4) {
  const demoProducts = [
    {
      id: "demo-1",
      title: "PLA Filament - Arctic White",
      handle: "pla-arctic-white",
      thumbnail: "https://images.unsplash.com/photo-1615850752729-592709f8eb41?w=500&h=500&fit=crop",
      description: "Premium PLA filament for 3D printing",
      variants: [{ id: "v1", prices: [{ amount: 2499, currency_code: "usd" }], title: "Default" }],
      options: [],
      type: { id: "", value: "Filament" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo-2",
      title: "Voron 2.4 Kit - Complete",
      handle: "voron-2-4-kit",
      thumbnail: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=500&h=500&fit=crop",
      description: "Full Voron 2.4 build kit",
      variants: [{ id: "v2", prices: [{ amount: 129900, currency_code: "usd" }], title: "Default" }],
      options: [],
      type: { id: "", value: "Kit" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo-3",
      title: "LDO Motor Set - NEMA17",
      handle: "ldo-motor-set",
      thumbnail: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500&h=500&fit=crop",
      description: "High-torque stepper motors",
      variants: [{ id: "v3", prices: [{ amount: 15900, currency_code: "usd" }], title: "Set of 5" }],
      options: [],
      type: { id: "", value: "Electronics" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo-4",
      title: "PETG Filament - Deep Blue",
      handle: "petg-deep-blue",
      thumbnail: "https://images.unsplash.com/photo-1615850752729-592709f8eb41?w=500&h=500&fit=crop",
      description: "Durable PETG filament",
      variants: [{ id: "v4", prices: [{ amount: 2799, currency_code: "usd" }], title: "1kg Spool" }],
      options: [],
      type: { id: "", value: "Filament" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  return {
    products: demoProducts.slice(0, limit),
    count: demoProducts.length,
  }
}

export async function getProductByHandle(handle: string): Promise<StoreProduct | null> {
  try {
    const { products } = await sdk.store.product.list({
      handle,
      limit: 1,
      fields: "*variants,*variants.prices,*variants.images,*options,*options.values,*images,*type,*collection,*tags",
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
      limit: 100,
      fields: "handle",
    })

    return products.map((p) => p.handle)
  } catch (error) {
    console.warn("Failed to fetch product handles for SSG", error)
    return []
  }
}

export async function getCategoryProductCounts(
  categoryIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()

  const results = await Promise.allSettled(
    categoryIds.map((categoryId) =>
      sdk.store.product.list({
        category_id: [categoryId],
        limit: 1,
        fields: "id",
      })
    )
  )

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      counts.set(categoryIds[index], result.value.count)
    } else {
      counts.set(categoryIds[index], 0)
    }
  })

  return counts
}

export async function getCollectionProductCounts(
  collectionIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()

  const results = await Promise.allSettled(
    collectionIds.map((collectionId) =>
      sdk.store.product.list({
        collection_id: [collectionId],
        limit: 1,
        fields: "id",
      })
    )
  )

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      counts.set(collectionIds[index], result.value.count)
    } else {
      counts.set(collectionIds[index], 0)
    }
  })

  return counts
}
