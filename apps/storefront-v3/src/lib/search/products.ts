/**
 * Product Search Service
 *
 * Primary data source for shop page using Meilisearch.
 * Falls back to Medusa SDK when Meilisearch is unavailable.
 */

import { searchClient, INDEX_PRODUCTS } from "@/lib/search/client"
import { getProducts } from "@/lib/medusa/products"
import type { MeilisearchProductDocument } from "@3dbyte-tech-store/shared-types"

// ============================================================================
// Types
// ============================================================================

/**
 * Parameters for product search
 */
export interface ProductSearchParams {
  /** Search query string */
  query?: string
  /** Page number (1-indexed) */
  page?: number
  /** Number of results per page (default: 20) */
  limit?: number
  /** Sort order */
  sort?: "newest" | "price-asc" | "price-desc"
  /** Filter options */
  filters?: {
    /** Multiple category IDs (OR within) */
    categoryIds?: string[]
    /** Multiple brand IDs (OR within) */
    brandIds?: string[]
    /** Multiple collection IDs (OR within) */
    collectionIds?: string[]
    /** On sale filter */
    onSale?: boolean
    /** In stock filter */
    inStock?: boolean
    /** Minimum price (AUD) */
    minPrice?: number
    /** Maximum price (AUD) */
    maxPrice?: number
    /** Dynamic product options (e.g., { colour: ["Black", "White"], size: ["S", "M"] }) */
    options?: Record<string, string[]>
  }
}

/**
 * Product hit returned from search
 */
export interface ProductHit {
  id: string
  handle: string
  title: string
  thumbnail?: string
  price_aud: number
  original_price_aud?: number
  on_sale: boolean
  in_stock: boolean
  inventory_quantity: number
  category_ids: string[]
  categories: string[]
  brand?: {
    id: string
    name: string
    handle: string
    logo?: string
  }
  variants: Array<{
    id: string
    sku?: string
    title: string
  }>
  // Dynamic option keys (options_colour, options_size, etc.)
  [key: `options_${string}`]: string[] | undefined
}

/**
 * Facet distribution from Meilisearch
 */
export type FacetDistribution = Record<string, Record<string, number>>

/**
 * Result from product search
 */
export interface ProductSearchResult {
  /** Array of product hits */
  products: ProductHit[]
  /** Total count of matching products */
  totalCount: number
  /** Facet distribution for filter UI */
  facets: FacetDistribution
  /** Error occurred (both Meilisearch and Medusa failed) */
  error?: boolean
  /** Using Medusa fallback (degraded mode - no facets) */
  degradedMode?: boolean
}

/**
 * Result from facets-only query
 */
export interface FacetsResult {
  /** Facet distribution for filter UI (unfiltered) */
  facets: FacetDistribution
  /** Error occurred */
  error?: boolean
}

// ============================================================================
// Sort Mapping
// ============================================================================

const SORT_MAP: Record<string, string[]> = {
  newest: ["created_at_timestamp:desc"],
  "price-asc": ["price_aud:asc"],
  "price-desc": ["price_aud:desc"],
}

// ============================================================================
// Facets to Request
// ============================================================================

const FACETS_TO_REQUEST = [
  "brand.id",
  "category_ids",
  "collection_ids",
  "on_sale",
  "in_stock",
  "price_aud",
  // Note: options_* facets are dynamic and handled separately
]

// ============================================================================
// Filter Building
// ============================================================================

/**
 * Build Meilisearch filter string from search params
 *
 * Filter logic:
 * - Multi-select filters use OR within (categories, brands, options)
 * - All filters joined with AND
 */
function buildFilters(params: ProductSearchParams): string[] {
  const filters: string[] = []
  const { filters: f } = params

  if (!f) return filters

  // Category IDs - multi-select (OR within, AND with others)
  if (f.categoryIds && f.categoryIds.length > 0) {
    const categoryFilter = f.categoryIds
      .map((id) => `category_ids = "${id}"`)
      .join(" OR ")
    filters.push(`(${categoryFilter})`)
  }

  // Brand IDs - multi-select (OR within, AND with others)
  if (f.brandIds && f.brandIds.length > 0) {
    const brandFilter = f.brandIds
      .map((id) => `brand.id = "${id}"`)
      .join(" OR ")
    filters.push(`(${brandFilter})`)
  }

  // Collection IDs - multi-select (OR within, AND with others)
  if (f.collectionIds && f.collectionIds.length > 0) {
    const collectionFilter = f.collectionIds
      .map((id) => `collection_ids = "${id}"`)
      .join(" OR ")
    filters.push(`(${collectionFilter})`)
  }

  // On sale filter
  if (f.onSale !== undefined) {
    filters.push(`on_sale = ${f.onSale}`)
  }

  // In stock filter
  if (f.inStock !== undefined) {
    filters.push(`in_stock = ${f.inStock}`)
  }

  // Price range filters
  if (f.minPrice !== undefined) {
    filters.push(`price_aud >= ${f.minPrice}`)
  }
  if (f.maxPrice !== undefined) {
    filters.push(`price_aud <= ${f.maxPrice}`)
  }

  // Dynamic options filters - multi-select (OR within same option, AND across options)
  if (f.options) {
    Object.entries(f.options).forEach(([optionKey, values]) => {
      if (values && values.length > 0) {
        const optionFilter = values
          .map((v) => `options_${optionKey} = "${v}"`)
          .join(" OR ")
        filters.push(`(${optionFilter})`)
      }
    })
  }

  return filters
}

/**
 * Get dynamic option facets from Meilisearch settings
 * We request common option facets that are likely to exist
 */
function getOptionFacets(): string[] {
  // Common option facets in the product index
  return [
    "options_colour",
    "options_size",
    "options_nozzle_type",
    "options_nozzle_size",
  ]
}

// ============================================================================
// Main Search Function
// ============================================================================

/**
 * Search products using Meilisearch as primary data source
 *
 * @param params - Search parameters
 * @returns Product search result with products, facets, and status flags
 */
export async function searchProducts(
  params: ProductSearchParams = {}
): Promise<ProductSearchResult> {
  const { query = "", page = 1, limit = 20, sort } = params

  // Try Meilisearch first
  try {
    const index = searchClient.index(INDEX_PRODUCTS)

    // Build filters
    const filters = buildFilters(params)

    // Build sort array
    const sortArray = sort ? SORT_MAP[sort] : undefined

    // Combine static and dynamic facets
    const allFacets = [...FACETS_TO_REQUEST, ...getOptionFacets()]

    // Calculate offset from page
    const offset = (page - 1) * limit

    // Execute search
    const result = await index.search<MeilisearchProductDocument>(query, {
      limit,
      offset,
      filter: filters.length > 0 ? filters.join(" AND ") : undefined,
      sort: sortArray,
      facets: allFacets,
    })

    // Transform hits to ProductHit format
    const products: ProductHit[] = result.hits.map((hit) => ({
      id: hit.id,
      handle: hit.handle,
      title: hit.title,
      thumbnail: hit.thumbnail,
      price_aud: hit.price_aud ?? 0,
      original_price_aud: hit.price_aud, // Will be different for sale items
      on_sale: hit.on_sale,
      in_stock: hit.in_stock,
      inventory_quantity: hit.inventory_quantity,
      category_ids: hit.category_ids,
      categories: hit.categories,
      brand: hit.brand,
      variants: hit.variants,
    }))

    return {
      products,
      totalCount: result.estimatedTotalHits,
      facets: (result.facetDistribution as FacetDistribution) || {},
      error: false,
      degradedMode: false,
    }
  } catch (error) {
    console.warn("Meilisearch search failed, falling back to Medusa", error)

    // Fallback to Medusa SDK
    try {
      const medusaResult = await getProducts({
        page,
        limit,
        q: query || undefined,
        category_id: params.filters?.categoryIds,
        minPrice: params.filters?.minPrice,
        maxPrice: params.filters?.maxPrice,
      })

      // Transform Medusa products to ProductHit format
      // Note: Medusa v2 returns prices in dollars, not cents
      const products: ProductHit[] = medusaResult.products.map((p: any) => ({
        id: p.id,
        handle: p.handle,
        title: p.title,
        thumbnail: p.thumbnail,
        price_aud: p.variants?.[0]?.prices?.[0]?.amount ?? 0,
        original_price_aud: p.variants?.[0]?.original_price ?? undefined,
        on_sale: p.on_sale ?? false,
        in_stock:
          (p.variants?.[0]?.inventory_quantity ?? 0) > 0 ||
          !p.variants?.[0]?.manage_inventory,
        inventory_quantity: p.variants?.[0]?.inventory_quantity ?? 0,
        category_ids: p.categories?.map((c: any) => c.id) ?? [],
        categories: p.categories?.map((c: any) => c.name) ?? [],
        brand: p.brand,
        variants:
          p.variants?.map((v: any) => ({
            id: v.id,
            sku: v.sku,
            title: v.title,
          })) ?? [],
      }))

      return {
        products,
        totalCount: medusaResult.count,
        facets: {}, // No facets in degraded mode
        error: false,
        degradedMode: true,
      }
    } catch (fallbackError) {
      console.error("Both Meilisearch and Medusa failed", fallbackError)

      return {
        products: [],
        totalCount: 0,
        facets: {},
        error: true,
        degradedMode: false,
      }
    }
  }
}

// ============================================================================
// Facets-Only Query (for filter UI)
// ============================================================================

/**
 * Get unfiltered facets for filter UI
 *
 * This fetches all available facets without any filters applied,
 * so the filter UI can show all options even when some are already selected.
 *
 * @returns Facets result with all available filter options
 */
export async function getFacets(): Promise<FacetsResult> {
  try {
    const index = searchClient.index(INDEX_PRODUCTS)

    // Combine static and dynamic facets
    const allFacets = [...FACETS_TO_REQUEST, ...getOptionFacets()]

    // Search with limit 0 to get only facets, no products
    const result = await index.search("", {
      limit: 0,
      facets: allFacets,
    })

    return {
      facets: (result.facetDistribution as FacetDistribution) || {},
      error: false,
    }
  } catch (error) {
    console.warn("Failed to fetch facets", error)
    return {
      facets: {},
      error: true,
    }
  }
}
