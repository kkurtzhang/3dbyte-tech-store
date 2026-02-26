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
      fields: "*variants,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory",
    })

    products = fetchedProducts as any
    count = fetchedCount
  } catch (error) {
    console.warn("Medusa SDK failed, falling back to Meilisearch", error)
  }

  // If products array is empty (Medusa failed or no products), fallback to Meilisearch
  if (!products || products.length === 0) {
    try {
      const result = await getProductsFromMeilisearch(params)
      products = result.products as any
      count = result.count
    } catch (error) {
      console.warn("Meilisearch also failed, returning empty results", error)
      // Return empty results instead of demo products
      products = []
      count = 0
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
    console.warn("Meilisearch failed, returning empty results", error)
    return { products: [], count: 0 }
  }
}

export async function getProductByHandle(handle: string): Promise<StoreProduct | null> {
  try {
    const { products } = await sdk.store.product.list({
      handle,
      limit: 1,
      fields: "*variants,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory,*variants.images,*variants.calculated_price,*options,*options.values,*images,*type,*collection,*tags",
    })

    if (products[0]) {
      return products[0]
    }
  } catch (error) {
    console.warn(`Medusa SDK failed for handle ${handle}, trying Meilisearch fallback`, error)
  }

  // Fallback to Meilisearch when Medusa fails or returns empty
  try {
    const result = await searchClient.index(INDEX_PRODUCTS).search("", {
      filter: `handle = "${handle}"`,
      limit: 1,
    })

    if (result.hits[0]) {
      const hit = result.hits[0] as any
      return {
        id: hit.id,
        title: hit.title,
        handle: hit.handle || hit.slug,
        thumbnail: hit.thumbnail || hit.image,
        description: hit.description,
        variants: hit.variants || [],
        options: hit.options || [],
        images: hit.images || [],
        type: hit.type ? { id: "", value: hit.type } : undefined,
        collection: hit.collection,
        tags: hit.tags,
        created_at: hit.created_at,
        updated_at: hit.updated_at,
      } as unknown as StoreProduct
    }
  } catch (error) {
    console.warn(`Meilisearch fallback also failed for handle ${handle}`, error)
  }

  return null
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

/**
 * Get products with discounts (on sale)
 */
export async function getDiscountedProducts(params: {
  page?: number
  limit?: number
  minDiscount?: number
  maxDiscount?: number
}): Promise<{ products: StoreProduct[]; count: number }> {
  let products: StoreProduct[] = []
  let count = 0
  const { page = 1, limit = 20, minDiscount, maxDiscount } = params

  try {
    const { products: fetchedProducts } = await sdk.store.product.list({
      limit: 100,
      offset: (page - 1) * limit,
      fields: "*variants,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory,*variants.calculated_price,*variants.original_price",
    })

    const discountedProducts = fetchedProducts.filter((product) => {
      const variant = product.variants?.[0]
      if (!variant) return false

      const calcPrice = variant.calculated_price?.calculated_amount
      const origPrice = (variant as any).original_price?.amount || (variant as any).calculated_price?.original_amount

      if (!origPrice || !calcPrice || origPrice <= 0) return false

      const discountPct = ((origPrice - calcPrice) / origPrice) * 100

      if (minDiscount !== undefined && discountPct < minDiscount) return false
      if (maxDiscount !== undefined && discountPct > maxDiscount) return false

      ;(product as any).discountPercentage = discountPct
      ;(product as any).originalPrice = origPrice / 100
      ;(product as any).salePrice = calcPrice / 100

      return discountPct > 0
    })

    const offset = (page - 1) * limit
    products = discountedProducts.slice(offset, offset + limit) as any
    count = discountedProducts.length
  } catch (error) {
    console.warn("Failed to fetch discounted products from Medusa", error)
    // Return empty results instead of demo products
    products = []
    count = 0
  }

  return { products, count }
}

/**
 * Get product bundles
 * Bundles are identified by tags containing "bundle" or metadata indicating bundle status
 */
export async function getProductBundles(params: {
  page?: number
  limit?: number
}): Promise<{ products: StoreProduct[]; count: number }> {
  let products: StoreProduct[] = []
  let count = 0
  const { page = 1, limit = 20 } = params

  try {
    // Fetch products with bundle tag
    const { products: fetchedProducts, count: fetchedCount } = await sdk.store.product.list({
      limit: 100, // Fetch more to filter for bundles
      offset: 0,
      fields: "*variants,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory,*tags,*metadata",
    })

    // Filter products that are bundles (tag contains "bundle" or metadata indicates bundle)
    const bundleProducts = fetchedProducts.filter((product) => {
      const tags = product.tags || []
      const hasBundleTag = tags.some(
        (tag) => tag.value?.toLowerCase().includes("bundle")
      )
      const metadata = product.metadata as Record<string, unknown> | null
      const isBundleFromMetadata = metadata?.is_bundle === true
      
      return hasBundleTag || isBundleFromMetadata
    })

    const offset = (page - 1) * limit
    products = bundleProducts.slice(offset, offset + limit) as any
    count = bundleProducts.length
  } catch (error) {
    console.warn("Failed to fetch bundle products from Medusa", error)
    // Return empty results instead of demo products
    products = []
    count = 0
  }

  return { products, count }
}

/**
 * Get related products based on category and type
 * This simulates "frequently bought together" based on product relationships
 */
export async function getRelatedProducts(productId: string, limit = 4): Promise<StoreProduct[]> {
  try {
    // First, get the current product to find its category and type
    const { products: [currentProduct] } = await sdk.store.product.list({
      id: [productId],
      limit: 1,
      fields: "*categories,*type,*collection",
    })

    if (!currentProduct) {
      return []
    }

    // Build filters - find products in same category or with same type
    const categoryIds = currentProduct.categories?.map((c) => c.id) || []
    const typeId = currentProduct.type?.id

    // Fetch products that might be related
    const filterParams: any = {
      limit: 20, // Fetch more to filter
      fields: "*variants,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory,*variants.calculated_price,*categories,*type,*collection",
    }

    if (categoryIds.length > 0) {
      filterParams.category_id = categoryIds
    }

    const { products } = await sdk.store.product.list(filterParams)

    // Filter out the current product and limit results
    const relatedProducts = products
      .filter((p) => p.id !== productId)
      .slice(0, limit)

    if (relatedProducts.length > 0) {
      return relatedProducts
    }

    // If not enough related products, fetch from same collection
    if (currentProduct.collection_id) {
      const { products: collectionProducts } = await sdk.store.product.list({
        collection_id: [currentProduct.collection_id],
        limit: limit + 1,
        fields: "*variants,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory,*variants.calculated_price",
      })

      return collectionProducts
        .filter((p) => p.id !== productId)
        .slice(0, limit)
    }

    return []
  } catch (error) {
    console.warn("Failed to fetch related products from Medusa", error)
    // Return empty array instead of demo products
    return []
  }
}
