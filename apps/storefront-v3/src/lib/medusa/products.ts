import { sdk } from "./client"
import { searchClient, INDEX_PRODUCTS } from "@/lib/search/client"
import type { MedusaProduct } from "./types"
import { getBundleLink } from "./bundles"
import type { PricingContext } from "./regions"

type PricingParams = Partial<PricingContext>

export type ProductReadResult =
  | { status: "live"; product: MedusaProduct }
  | { status: "cached_read_only"; product: MedusaProduct }
  | { status: "not_found" }
  | { status: "unavailable" }

const PRODUCT_PRICE_FIELDS =
  "*variants.calculated_price,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory"

function withPricingContext<T extends Record<string, unknown>>(
  params: T,
  pricing?: PricingParams
) {
  return {
    ...params,
    ...(pricing?.region_id ? { region_id: pricing.region_id } : {}),
    ...(pricing?.country_code ? { country_code: pricing.country_code } : {}),
  }
}

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
  region_id?: string
  country_code?: string
  currency_code?: string
}): Promise<{ products: MedusaProduct[]; count: number }> {
  const { page = 1, limit = 20, category_id, collection_id, q } = params
  const { products, count } = await sdk.store.product.list(
    withPricingContext(
      {
        limit,
        offset: (page - 1) * limit,
        category_id,
        collection_id,
        q,
        fields:
          `${PRODUCT_PRICE_FIELDS},*variants.preorder_variant,*variants.preorder_variant.prices,*bundle,*bundle.items,*bundle.items.product`,
      },
      params
    )
  )

  return { products: products as MedusaProduct[], count }
}

function escapeMeilisearchFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function cachedProductFromSearchHit(hit: Record<string, any>): MedusaProduct {
  return {
    id: String(hit.id),
    title: String(hit.title ?? "Product"),
    handle: String(hit.handle ?? hit.slug ?? ""),
    thumbnail: hit.thumbnail ?? hit.image,
    description: hit.description,
    // Search is a derived, eventually-consistent projection. Never construct a
    // purchasable variant from it when Medusa cannot confirm price or stock.
    variants: [],
    options: [],
    images: Array.isArray(hit.images) ? hit.images : [],
    type: hit.type ? { id: "", value: hit.type } : undefined,
    collection: hit.collection,
    tags: hit.tags,
    is_bundle: hit.is_bundle === true,
    bundle_item_count: hit.bundle_item_count ?? 0,
    bundle_item_titles: Array.isArray(hit.bundle_item_titles)
      ? hit.bundle_item_titles
      : [],
    created_at: hit.created_at,
    updated_at: hit.updated_at,
  } as unknown as MedusaProduct
}

export async function getProductReadByHandle(
  handle: string,
  pricing?: PricingParams
): Promise<ProductReadResult> {
  try {
    const { products } = await sdk.store.product.list(
      withPricingContext(
        {
          handle,
          limit: 1,
          fields:
            `${PRODUCT_PRICE_FIELDS},*variants.preorder_variant,*variants.preorder_variant.prices,*variants.images,*options,*options.values,*images,*type,*collection,*tags,*bundle,*bundle.items,*bundle.items.product`,
        },
        pricing
      )
    )

    if (products[0]) {
      return { status: "live", product: products[0] }
    }

    // A successful empty Medusa response is authoritative. Falling back here
    // would revive deleted or unpublished products from a stale search index.
    return { status: "not_found" }
  } catch (error) {
    console.warn(`Medusa SDK failed for handle ${handle}, trying Meilisearch fallback`, error)
  }

  // Fallback to Meilisearch when Medusa fails or returns empty
  try {
    const result = await searchClient.index(INDEX_PRODUCTS).search("", {
      filter: `handle = "${escapeMeilisearchFilterValue(handle)}"`,
      limit: 1,
    })

    if (result.hits[0]) {
      return {
        status: "cached_read_only",
        product: cachedProductFromSearchHit(result.hits[0] as Record<string, any>),
      }
    }
  } catch (error) {
    console.warn(`Meilisearch fallback also failed for handle ${handle}`, error)
    return { status: "unavailable" }
  }

  return { status: "unavailable" }
}

export async function getProductByHandle(
  handle: string,
  pricing?: PricingParams
): Promise<MedusaProduct | null> {
  const result = await getProductReadByHandle(handle, pricing)
  return result.status === "live" || result.status === "cached_read_only"
    ? result.product
    : null
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
  region_id?: string
  country_code?: string
  currency_code?: string
}): Promise<{ products: MedusaProduct[]; count: number }> {
  let products: MedusaProduct[] = []
  let count = 0
  const { page = 1, limit = 20, minDiscount, maxDiscount } = params

  try {
    const { products: fetchedProducts } = await sdk.store.product.list(
      withPricingContext(
        {
          limit: 100,
          offset: (page - 1) * limit,
          fields:
            `${PRODUCT_PRICE_FIELDS},*variants.original_price`,
        },
        params
      )
    )

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
      ;(product as any).originalPrice = origPrice
      ;(product as any).salePrice = calcPrice

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
  region_id?: string
  country_code?: string
  currency_code?: string
}): Promise<{ products: MedusaProduct[]; count: number }> {
  let products: MedusaProduct[] = []
  let count = 0
  const { page = 1, limit = 20 } = params

  try {
    // Fetch products with bundle tag
    const { products: fetchedProducts } = await sdk.store.product.list(
      withPricingContext(
        {
          limit: 100, // Fetch more to filter for bundles
          offset: 0,
          fields: `${PRODUCT_PRICE_FIELDS},*tags,*metadata,*bundle`,
        },
        params
      )
    )

    const bundleProducts = fetchedProducts.filter((product) => getBundleLink(product) !== null)

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
export async function getRelatedProducts(
  productId: string,
  limit = 4,
  pricing?: PricingParams
): Promise<MedusaProduct[]> {
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
    // Fetch products that might be related
    const filterParams: any = {
      limit: 20, // Fetch more to filter
      fields: `${PRODUCT_PRICE_FIELDS},*categories,*type,*collection`,
    }
    Object.assign(filterParams, withPricingContext({}, pricing))

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
        fields: PRODUCT_PRICE_FIELDS,
        ...withPricingContext({}, pricing),
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
