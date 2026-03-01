"use server"

import { searchClient, INDEX_PRODUCTS } from "@/lib/search/client"

export interface SearchOptions {
  limit?: number
  page?: number
  categories?: string[]
  brands?: string[]
  collections?: string[]
  onSale?: boolean
  inStock?: boolean
  minPrice?: number
  maxPrice?: number
  options?: Record<string, string[]>
  sort?: string
}

export interface SearchResult {
  hits: Array<{
    id: string
    handle: string
    title: string
    thumbnail: string
    price: { amount: number; currency_code: string }
    originalPrice?: number
    discountPercentage?: number
    variants?: any[]
    on_sale?: boolean
  }>
  totalCount: number
  estimatedTotalHits: number
  facetDistribution?: Record<string, Record<string, number>>
  degradedMode?: boolean
}

/**
 * Get sort order string for Meilisearch
 * Meilisearch uses :asc and :desc suffixes for sorting
 * Note: Index uses created_at_timestamp (Unix timestamp) for sorting by date
 */
function getSortOrder(sort: string): string | undefined {
  switch (sort) {
    case "newest":
      return "created_at_timestamp:desc"
    case "price-asc":
      return "price_aud:asc"
    case "price-desc":
      return "price_aud:desc"
    default:
      return "created_at_timestamp:desc"
  }
}

export async function searchProducts(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const {
    limit = 20,
    categories,
    collections,
    brands,
    onSale,
    inStock,
    minPrice,
    maxPrice,
    options: dynamicOptions,
    sort = "newest"
  } = options

  try {
    const index = searchClient.index(INDEX_PRODUCTS)

    const filter: string[] = []

    // Category filter
    if (categories && categories.length > 0) {
      filter.push(`category_ids IN [${categories.map(c => `"${c}"`).join(", ")}]`)
    }

    // Brand filter
    if (brands && brands.length > 0) {
      filter.push(`brand.id IN [${brands.map(b => `"${b}"`).join(", ")}]`)
    }

    // Collection filter
    if (collections && collections.length > 0) {
      filter.push(`collection_ids IN [${collections.map(c => `"${c}"`).join(", ")}]`)
    }

    // On sale filter
    if (onSale) {
      filter.push(`on_sale = true`)
    }

    // In stock filter
    if (inStock) {
      filter.push(`in_stock = true`)
    }

    // Price range filters
    if (minPrice !== undefined) {
      filter.push(`price_aud >= ${minPrice}`)
    }
    if (maxPrice !== undefined) {
      filter.push(`price_aud <= ${maxPrice}`)
    }

    // Dynamic options filters (e.g., colour, size, nozzle_type)
    if (dynamicOptions) {
      Object.entries(dynamicOptions).forEach(([key, values]) => {
        if (values.length > 0) {
          filter.push(`${key} IN [${values.map(v => `"${v}"`).join(", ")}]`)
        }
      })
    }

    const sortOrder = getSortOrder(sort)

    const result = await index.search(query, {
      limit,
      filter: filter.length > 0 ? filter.join(" AND ") : undefined,
      sort: sortOrder ? [sortOrder] : undefined,
      // Request actual fields from Meilisearch index
      attributesToRetrieve: [
        "id", "handle", "title", "thumbnail",
        "price_aud", "original_price_aud", "on_sale",
        "in_stock", "inventory_quantity",
        "categories", "category_ids", "brand", "collection_ids"
      ],
    })

    // Transform hits to match ProductCard expected format
    const hits = result.hits.map((hit: any) => ({
      id: hit.id,
      handle: hit.handle,
      title: hit.title,
      thumbnail: hit.thumbnail,
      // Transform price to ProductCard format
      price: {
        amount: hit.price_aud ?? 0,
        currency_code: "aud",
      },
      originalPrice: hit.original_price_aud && hit.original_price_aud > hit.price_aud
        ? hit.original_price_aud
        : undefined,
      discountPercentage: hit.original_price_aud && hit.price_aud && hit.original_price_aud > hit.price_aud
        ? Math.round((1 - hit.price_aud / hit.original_price_aud) * 100)
        : undefined,
      specs: [],
    }))

    return {
      hits,
      totalCount: result.estimatedTotalHits,
      estimatedTotalHits: result.estimatedTotalHits,
      degradedMode: false,
    }
  } catch (error) {
    console.error("Search failed:", error)
    return {
      hits: [],
      totalCount: 0,
      estimatedTotalHits: 0,
      degradedMode: true,
    }
  }
}
