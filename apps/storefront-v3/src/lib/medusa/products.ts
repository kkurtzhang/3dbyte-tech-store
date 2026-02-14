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
      fields: "*variants,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory,*variants.images,*options,*options.values,*images,*type,*collection,*tags",
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
    const result = getDemoDiscountedProducts(params)
    products = result.products as any
    count = result.count
  }

  return { products, count }
}

function getDemoDiscountedProducts(params: {
  limit?: number
  minDiscount?: number
  maxDiscount?: number
}) {
  const demoDiscountedProducts = [
    {
      id: "demo-sale-1",
      title: "PLA Filament - Arctic White (Sale)",
      handle: "pla-arctic-white-sale",
      thumbnail: "https://images.unsplash.com/photo-1615850752729-592709f8eb41?w=500&h=500&fit=crop",
      description: "Premium PLA filament for 3D printing",
      variants: [{ 
        id: "v1", 
        prices: [{ amount: 2499, currency_code: "usd" }],
        calculated_price: { calculated_amount: 1749, currency_code: "usd" },
        original_price: { amount: 2499, currency_code: "usd" },
        title: "Default" 
      }],
      options: [],
      type: { id: "", value: "Filament" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      discountPercentage: 30,
      originalPrice: 24.99,
      salePrice: 17.49,
    },
    {
      id: "demo-sale-2",
      title: "Voron 2.4 Kit - Complete (Clearance)",
      handle: "voron-2-4-kit-sale",
      thumbnail: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=500&h=500&fit=crop",
      description: "Full Voron 2.4 build kit",
      variants: [{ 
        id: "v2", 
        prices: [{ amount: 129900, currency_code: "usd" }],
        calculated_price: { calculated_amount: 90930, currency_code: "usd" },
        original_price: { amount: 129900, currency_code: "usd" },
        title: "Default" 
      }],
      options: [],
      type: { id: "", value: "Kit" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      discountPercentage: 30,
      originalPrice: 1299.00,
      salePrice: 909.30,
    },
    {
      id: "demo-sale-3",
      title: "LDO Motor Set - NEMA17 (20% Off)",
      handle: "ldo-motor-set-sale",
      thumbnail: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500&h=500&fit=crop",
      description: "High-torque stepper motors",
      variants: [{ 
        id: "v3", 
        prices: [{ amount: 15900, currency_code: "usd" }],
        calculated_price: { calculated_amount: 12720, currency_code: "usd" },
        original_price: { amount: 15900, currency_code: "usd" },
        title: "Set of 5" 
      }],
      options: [],
      type: { id: "", value: "Electronics" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      discountPercentage: 20,
      originalPrice: 159.00,
      salePrice: 127.20,
    },
    {
      id: "demo-sale-4",
      title: "PETG Filament - Deep Blue (40% Off)",
      handle: "petg-deep-blue-sale",
      thumbnail: "https://images.unsplash.com/photo-1615850752729-592709f8eb41?w=500&h=500&fit=crop",
      description: "Durable PETG filament",
      variants: [{ 
        id: "v4", 
        prices: [{ amount: 2799, currency_code: "usd" }],
        calculated_price: { calculated_amount: 1679, currency_code: "usd" },
        original_price: { amount: 2799, currency_code: "usd" },
        title: "1kg Spool" 
      }],
      options: [],
      type: { id: "", value: "Filament" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      discountPercentage: 40,
      originalPrice: 27.99,
      salePrice: 16.79,
    },
    {
      id: "demo-sale-5",
      title: "Hotend Kit - V6 (15% Off)",
      handle: "hotend-v6-sale",
      thumbnail: "https://images.unsplash.com/photo-1565085108884-63f96f1e6037?w=500&h=500&fit=crop",
      description: "High-performance V6 hotend",
      variants: [{ 
        id: "v5", 
        prices: [{ amount: 8999, currency_code: "usd" }],
        calculated_price: { calculated_amount: 7649, currency_code: "usd" },
        original_price: { amount: 8999, currency_code: "usd" },
        title: "Default" 
      }],
      options: [],
      type: { id: "", value: "Parts" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      discountPercentage: 15,
      originalPrice: 89.99,
      salePrice: 76.49,
    },
    {
      id: "demo-sale-6",
      title: "Build Plate - PEI (25% Off)",
      handle: "pei-build-plate-sale",
      thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop",
      description: "Premium PEI build plate",
      variants: [{ 
        id: "v6", 
        prices: [{ amount: 4999, currency_code: "usd" }],
        calculated_price: { calculated_amount: 3749, currency_code: "usd" },
        original_price: { amount: 4999, currency_code: "usd" },
        title: "Default" 
      }],
      options: [],
      type: { id: "", value: "Accessories" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      discountPercentage: 25,
      originalPrice: 49.99,
      salePrice: 37.49,
    },
  ]

  const { limit = 4, minDiscount, maxDiscount } = params
  let filtered = demoDiscountedProducts
  
  if (minDiscount !== undefined) {
    filtered = filtered.filter(p => p.discountPercentage >= minDiscount)
  }
  if (maxDiscount !== undefined) {
    filtered = filtered.filter(p => p.discountPercentage <= maxDiscount)
  }

  return {
    products: filtered.slice(0, limit || demoDiscountedProducts.length),
    count: filtered.length,
  }
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
    // Return demo bundles as fallback
    const result = getDemoBundles(params)
    products = result.products as any
    count = result.count
  }

  return { products, count }
}

/**
 * Demo bundles fallback
 */
function getDemoBundles(params: {
  limit?: number
}) {
  const demoBundles = [
    {
      id: "bundle-1",
      title: "Starter 3D Printing Kit",
      handle: "starter-3d-printing-kit",
      thumbnail: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=500&h=500&fit=crop",
      description: "Everything you need to get started with 3D printing. Includes filament, tools, and accessories.",
      variants: [{ id: "v1", prices: [{ amount: 19900, currency_code: "usd" }], title: "Default" }],
      options: [],
      type: { id: "", value: "Bundle" },
      tags: [{ id: "t1", value: "bundle" }],
      metadata: { is_bundle: true, bundle_items: ["demo-1", "demo-3", "demo-4"] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "bundle-2",
      title: "Pro Filament Pack",
      handle: "pro-filament-pack",
      thumbnail: "https://images.unsplash.com/photo-1615850752729-592709f8eb41?w=500&h=500&fit=crop",
      description: "Premium filament selection with 5 different colors. Perfect for professionals and enthusiasts.",
      variants: [{ id: "v2", prices: [{ amount: 9999, currency_code: "usd" }], title: "Default" }],
      options: [],
      type: { id: "", value: "Bundle" },
      tags: [{ id: "t2", value: "bundle" }],
      metadata: { is_bundle: true, bundle_items: ["demo-1", "demo-4"] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "bundle-3",
      title: "Voron Upgrade Bundle",
      handle: "voron-upgrade-bundle",
      thumbnail: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500&h=500&fit=crop",
      description: "Complete upgrade kit for your Voron printer. Includes motors, hotends, and more.",
      variants: [{ id: "v3", prices: [{ amount: 49900, currency_code: "usd" }], title: "Default" }],
      options: [],
      type: { id: "", value: "Bundle" },
      tags: [{ id: "t3", value: "bundle" }],
      metadata: { is_bundle: true, bundle_items: ["demo-2", "demo-3"] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "bundle-4",
      title: "Maintenance Essentials",
      handle: "maintenance-essentials",
      thumbnail: "https://images.unsplash.com/photo-1565085108884-63f96f1e6037?w=500&h=500&fit=crop",
      description: "Keep your printer running smoothly with this maintenance bundle.",
      variants: [{ id: "v4", prices: [{ amount: 4999, currency_code: "usd" }], title: "Default" }],
      options: [],
      type: { id: "", value: "Bundle" },
      tags: [{ id: "t4", value: "bundle" }],
      metadata: { is_bundle: true, bundle_items: [] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const { limit = 20 } = params
  return {
    products: demoBundles.slice(0, limit),
    count: demoBundles.length,
  }
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
      fields: "*category,*type,*collection",
    })

    if (!currentProduct) {
      return getDemoProducts(limit).products as unknown as StoreProduct[]
    }

    // Build filters - find products in same category or with same type
    const categoryIds = currentProduct.categories?.map((c) => c.id) || []
    const typeId = currentProduct.type?.id

    // Fetch products that might be related
    const filterParams: any = {
      limit: 20, // Fetch more to filter
      fields: "*variants,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory,*variants.calculated_price,*category,*type,*collection",
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

    return getDemoProducts(limit).products as unknown as StoreProduct[]
  } catch (error) {
    console.warn("Failed to fetch related products from Medusa", error)
    // Return demo products as fallback
    return getDemoProducts(limit).products as unknown as StoreProduct[]
  }
}
