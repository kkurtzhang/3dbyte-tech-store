import { sdk } from "./client"
import { searchClient, INDEX_PRODUCTS } from "@/lib/search/client"
import type { MedusaProduct } from "./types"
import { getBundleLink } from "./bundles"
import type { PricingContext } from "./regions"

type PricingParams = Partial<PricingContext>

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
  let products: MedusaProduct[] = []
  let count = 0

  try {
    const { page = 1, limit = 20, category_id, collection_id, q } = params

    const { products: fetchedProducts, count: fetchedCount } = await sdk.store.product.list(
      withPricingContext(
        {
          limit,
          offset: (page - 1) * limit,
          category_id,
          collection_id,
          q,
          fields:
            `${PRODUCT_PRICE_FIELDS},*variants.preorder_variant,*variants.preorder_variant.prices,*bundle`,
        },
        params
      )
    )

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
  currency_code?: string
}): Promise<{ products: MedusaProduct[]; count: number }> {
  try {
    const { limit = 4, q, colors, sizes, minPrice, maxPrice } = params
    const currencyCode = params.currency_code?.toLowerCase() || "aud"
    const priceField = `price_${currencyCode}`

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
      filter.push(`${priceField} >= ${minPrice}`)
    }

    if (maxPrice !== undefined) {
      filter.push(`${priceField} <= ${maxPrice}`)
    }

    const searchParams: any = {
      limit,
      filter: filter.length > 0 ? filter.join(" AND ") : undefined,
    }

    const results = await searchClient.index(INDEX_PRODUCTS).search("", searchParams)

    // Convert Meilisearch hits to StoreProduct format
    const products: MedusaProduct[] = results.hits.map((hit: any) => ({
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
    })) as unknown as MedusaProduct[]

    return { products, count: results.estimatedTotalHits || results.hits.length }
  } catch (error) {
    console.warn("Meilisearch failed, returning empty results", error)
    return { products: [], count: 0 }
  }
}

export async function getProductByHandle(
  handle: string,
  pricing?: PricingParams
): Promise<MedusaProduct | null> {
  try {
    const { products } = await sdk.store.product.list(
      withPricingContext(
        {
          handle,
          limit: 1,
          fields:
            `${PRODUCT_PRICE_FIELDS},*variants.preorder_variant,*variants.preorder_variant.prices,*variants.images,*options,*options.values,*images,*type,*collection,*tags,*bundle`,
        },
        pricing
      )
    )

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

      // Construct a variant with price data from Meilisearch
      // Note: Both Medusa v2 and Meilisearch store prices in dollars
      const currencyCode = pricing?.currency_code?.toLowerCase() || "aud"
      const priceField = `price_${currencyCode}`
      const originalPriceField = `original_price_${currencyCode}`
      const selectedPrice =
        typeof hit[priceField] === "number" ? hit[priceField] : hit.price_aud ?? 0
      const selectedOriginalPrice =
        typeof hit[originalPriceField] === "number"
          ? hit[originalPriceField]
          : currencyCode === "aud"
            ? hit.original_price_aud ?? selectedPrice
            : selectedPrice
      const onSale = hit.on_sale ?? false

      // Create a synthetic variant with price info for the quick view dialog
      const syntheticVariant = {
        id: hit.variants?.[0]?.id || `variant_${hit.id}`,
        title: hit.variants?.[0]?.title || "Default",
        sku: hit.variants?.[0]?.sku,
        preorder_variant: hit.variants?.[0]?.preorder_variant
          ? {
              ...hit.variants[0].preorder_variant,
              prices: hit.variants[0].preorder_variant.prices,
            }
          : undefined,
        prices: [{
          amount: selectedPrice,
          currency_code: currencyCode,
        }],
        calculated_price: onSale && selectedOriginalPrice > selectedPrice ? {
          calculated_amount: selectedPrice,
          original_amount: selectedOriginalPrice,
          currency_code: currencyCode,
        } : {
          calculated_amount: selectedPrice,
          original_amount: selectedPrice,
          currency_code: currencyCode,
        },
        inventory_quantity: hit.inventory_quantity ?? 0,
        manage_inventory: true,
      }

      return {
        id: hit.id,
        title: hit.title,
        handle: hit.handle || hit.slug,
        thumbnail: hit.thumbnail || hit.image,
        description: hit.description,
        variants: [syntheticVariant],
        options: hit.options || [],
        images: hit.images || [],
        type: hit.type ? { id: "", value: hit.type } : undefined,
        collection: hit.collection,
        tags: hit.tags,
        created_at: hit.created_at,
        updated_at: hit.updated_at,
      } as unknown as MedusaProduct
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
    const { products: fetchedProducts, count: fetchedCount } = await sdk.store.product.list(
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
    const typeId = currentProduct.type?.id

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
