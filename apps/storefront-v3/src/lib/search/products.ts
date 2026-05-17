/**
 * Product Search Service
 *
 * Primary data source for shop page using Meilisearch.
 * Falls back to Medusa SDK when Meilisearch is unavailable.
 */

import { searchClient, INDEX_PRODUCTS } from "@/lib/search/client"
import { getProducts } from "@/lib/medusa/products"
import {
  getAvailableInBundleLinks,
  isBundledProduct,
  type BundleLink,
} from "@/lib/medusa/bundles"
import type { MeilisearchProductDocument } from "@3dbyte-tech-store/shared-types"
import {
  DEFAULT_CURRENCY_CODE,
  normalizeCurrencyCode,
  type PricingContext,
} from "@/lib/medusa/regions"

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
  /** Region-derived pricing context */
  pricing?: Partial<PricingContext>
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
    /** Minimum discount percentage (0-100) - requires onSale=true for accurate results */
    minDiscount?: number
    /** Maximum discount percentage (0-100) - requires onSale=true for accurate results */
    maxDiscount?: number
    /** Dynamic product options (e.g., { colour: ["Black", "White"], size: ["S", "M"] }) */
    options?: Record<string, string[]>
    /** Only show bundle products */
    isBundle?: boolean
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
  price: number
  currency_code: string
  original_price?: number
  price_aud: number
  price_nzd?: number
  original_price_aud?: number
  original_price_nzd?: number
  discount_percentage?: number
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
  is_bundle?: boolean
  available_in_bundles_count?: number
  available_in_bundles?: BundleLink[]
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

function getPriceField(currencyCode?: string | null) {
  return `price_${normalizeCurrencyCode(currencyCode) ?? DEFAULT_CURRENCY_CODE}`
}

function getOriginalPriceField(currencyCode?: string | null) {
  return `original_price_${normalizeCurrencyCode(currencyCode) ?? DEFAULT_CURRENCY_CODE}`
}

function getSort(sort: ProductSearchParams["sort"], priceField: string) {
  if (sort === "price-asc") {
    return [`${priceField}:asc`]
  }

  if (sort === "price-desc") {
    return [`${priceField}:desc`]
  }

  return sort === "newest" ? ["created_at_timestamp:desc"] : undefined
}

// ============================================================================
// Facets to Request
// ============================================================================

const FACETS_TO_REQUEST = [
  "brand.id",
  "category_ids",
  "collection_ids",
  "is_bundle",
  "on_sale",
  "in_stock",
  "price_aud",
  // Note: options_* facets are dynamic and handled separately
]

function getUnsupportedFacet(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error)
  const unsupportedFacetMatch = message.match(/attribute [`"]?([a-z0-9_.]+)[`"]? is not filterable/i)
  return unsupportedFacetMatch?.[1] ?? null
}

function buildFacetRequest(excludedFacets: string[] = []): string[] {
  const staticFacets = FACETS_TO_REQUEST.filter(
    (facet) => !excludedFacets.includes(facet)
  )

  return [...staticFacets, ...getOptionFacets()]
}

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
function buildFilters(params: ProductSearchParams, priceField: string): string[] {
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

  if (f.isBundle !== undefined) {
    filters.push(`is_bundle = ${f.isBundle}`)
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
    filters.push(`${priceField} >= ${f.minPrice}`)
  }
  if (f.maxPrice !== undefined) {
    filters.push(`${priceField} <= ${f.maxPrice}`)
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
// Discount Calculation Helper
// ============================================================================

/**
 * Calculate discount percentage from original and sale price
 *
 * @param originalPrice - Original price before discount
 * @param salePrice - Current sale price
 * @returns Discount percentage (0-100) or undefined if not applicable
 */
function calculateDiscountPercentage(
  originalPrice?: number,
  salePrice?: number
): number | undefined {
  if (
    originalPrice === undefined ||
    salePrice === undefined ||
    originalPrice <= salePrice ||
    originalPrice <= 0
  ) {
    return undefined
  }
  return ((originalPrice - salePrice) / originalPrice) * 100
}

function deEmphasizeBundleRanking(products: ProductHit[]): ProductHit[] {
  const standardProducts = products.filter((product) => !product.is_bundle)
  const bundleProducts = products.filter((product) => product.is_bundle)

  return [...standardProducts, ...bundleProducts]
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
  const { minDiscount, maxDiscount } = params.filters || {}
  const currencyCode =
    normalizeCurrencyCode(params.pricing?.currency_code) ?? DEFAULT_CURRENCY_CODE
  const priceField = getPriceField(currencyCode)
  const originalPriceField = getOriginalPriceField(currencyCode)

  // If discount filtering is requested, use Medusa directly since
  // Meilisearch doesn't have discount_percentage indexed
  if (minDiscount !== undefined || maxDiscount !== undefined) {
    return searchWithDiscountFilter(params)
  }

  // Try Meilisearch first
  try {
    const index = searchClient.index(INDEX_PRODUCTS)

    // Build filters
    const filters = buildFilters(params, priceField)

    // Build sort array
    const sortArray = getSort(sort, priceField)

    // Calculate offset from page
    const offset = (page - 1) * limit

    let result
    let excludedFacets: string[] = []

    try {
      result = await index.search<MeilisearchProductDocument>(query, {
        limit,
        offset,
        filter: filters.length > 0 ? filters.join(" AND ") : undefined,
        sort: sortArray,
        facets: buildFacetRequest(),
      })
    } catch (error) {
      const unsupportedFacet = getUnsupportedFacet(error)

      if (!unsupportedFacet || !FACETS_TO_REQUEST.includes(unsupportedFacet)) {
        throw error
      }

      excludedFacets = [unsupportedFacet]
      console.warn(
        `Meilisearch index does not expose filterable ${unsupportedFacet}; retrying search without that facet`,
        error
      )

      result = await index.search<MeilisearchProductDocument>(query, {
        limit,
        offset,
        filter: filters.length > 0 ? filters.join(" AND ") : undefined,
        sort: sortArray,
        facets: buildFacetRequest(excludedFacets),
      })
    }

    // Transform hits to ProductHit format
    const products = deEmphasizeBundleRanking(result.hits.map((hit) => {
      // original_price_aud may not be indexed, access with proper typing
      const hitWithOriginalPrice = hit as typeof hit &
        Record<string, unknown> & {
          original_price_aud?: number
          original_price_nzd?: number
          is_bundle?: boolean
          available_in_bundles_count?: number
        }
      const originalPriceAud = hitWithOriginalPrice.original_price_aud
      const selectedOriginalPrice =
        typeof hitWithOriginalPrice[originalPriceField] === "number"
          ? hitWithOriginalPrice[originalPriceField]
          : currencyCode === DEFAULT_CURRENCY_CODE
            ? originalPriceAud
            : undefined
      const selectedPrice =
        typeof hitWithOriginalPrice[priceField] === "number"
          ? hitWithOriginalPrice[priceField]
          : hit.price_aud
      const discountPercentage = calculateDiscountPercentage(
        selectedOriginalPrice,
        selectedPrice
      )
      return {
        id: hit.id,
        handle: hit.handle,
        title: hit.title,
        thumbnail: hit.thumbnail,
        price: selectedPrice ?? 0,
        currency_code: currencyCode,
        original_price:
          selectedOriginalPrice && selectedOriginalPrice > (selectedPrice ?? 0)
            ? selectedOriginalPrice
            : undefined,
        price_aud: hit.price_aud ?? 0,
        price_nzd: hit.price_nzd,
        original_price_aud: originalPriceAud,
        original_price_nzd: hitWithOriginalPrice.original_price_nzd,
        discount_percentage: discountPercentage,
        on_sale: hit.on_sale,
        in_stock: hit.in_stock,
        inventory_quantity: hit.inventory_quantity,
        category_ids: hit.category_ids,
        categories: hit.categories,
        brand: hit.brand,
        is_bundle: hitWithOriginalPrice.is_bundle === true,
        available_in_bundles_count:
          typeof hitWithOriginalPrice.available_in_bundles_count === "number"
            ? hitWithOriginalPrice.available_in_bundles_count
            : getAvailableInBundleLinks(hitWithOriginalPrice).length,
        available_in_bundles: getAvailableInBundleLinks(hitWithOriginalPrice),
        variants: hit.variants,
      }
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

    return searchWithDiscountFilter(params)
  }
}

/**
 * Search products with discount filtering using Medusa
 *
 * This is used when discount filters are applied since Meilisearch
 * doesn't have discount_percentage indexed.
 */
async function searchWithDiscountFilter(
  params: ProductSearchParams
): Promise<ProductSearchResult> {
  const { query = "", page = 1, limit = 20 } = params
  const { minDiscount, maxDiscount, onSale } = params.filters || {}
  const currencyCode =
    normalizeCurrencyCode(params.pricing?.currency_code) ?? DEFAULT_CURRENCY_CODE

  try {
    // Use getDiscountedProducts for discount filtering
    const medusaResult = await getProducts({
      page,
      limit: 100, // Fetch more to allow for filtering
      q: query || undefined,
      category_id: params.filters?.categoryIds,
      minPrice: params.filters?.minPrice,
      maxPrice: params.filters?.maxPrice,
      region_id: params.pricing?.region_id,
      country_code: params.pricing?.country_code,
      currency_code: params.pricing?.currency_code,
    })

    // Transform and filter products
    let products = deEmphasizeBundleRanking(medusaResult.products
      .map((p: any) => {
        const variant = p.variants?.[0]
        const calcPrice = variant?.calculated_price?.calculated_amount ?? variant?.prices?.[0]?.amount ?? 0
        const origPrice =
          variant?.original_price?.amount ??
          variant?.calculated_price?.original_amount ??
          calcPrice

        const discountPercentage = calculateDiscountPercentage(origPrice, calcPrice)
        const isOnSale = origPrice > calcPrice

        return {
          id: p.id,
          handle: p.handle,
          title: p.title,
          thumbnail: p.thumbnail,
          price: calcPrice,
          currency_code: currencyCode,
          original_price: origPrice > calcPrice ? origPrice : undefined,
          price_aud: calcPrice,
          original_price_aud: origPrice > calcPrice ? origPrice : undefined,
          discount_percentage: discountPercentage,
          on_sale: isOnSale,
          in_stock:
            (variant?.inventory_quantity ?? 0) > 0 ||
            !variant?.manage_inventory,
          inventory_quantity: variant?.inventory_quantity ?? 0,
          category_ids: p.categories?.map((c: any) => c.id) ?? [],
          categories: p.categories?.map((c: any) => c.name) ?? [],
          brand: p.brand,
          is_bundle: isBundledProduct(p),
          available_in_bundles_count: getAvailableInBundleLinks(p).length,
          available_in_bundles: getAvailableInBundleLinks(p),
          variants:
            p.variants?.map((v: any) => ({
              id: v.id,
              sku: v.sku,
              title: v.title,
            })) ?? [],
        }
      })
      .filter((product) => {
        // Filter by onSale if requested
        if (onSale && !product.on_sale) return false

        // Filter by discount percentage
        const discount = product.discount_percentage ?? 0
        if (minDiscount !== undefined && discount < minDiscount) return false
        if (maxDiscount !== undefined && discount > maxDiscount) return false

        return true
      }))

    // Apply pagination after filtering
    const totalCount = products.length
    const offset = (page - 1) * limit
    products = products.slice(offset, offset + limit)

    return {
      products,
      totalCount,
      facets: {}, // No facets when using discount filter
      error: false,
      degradedMode: true,
    }
  } catch (error) {
    console.error("Medusa search with discount filter failed", error)

    return {
      products: [],
      totalCount: 0,
      facets: {},
      error: true,
      degradedMode: false,
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

    let result
    let excludedFacets: string[] = []

    try {
      result = await index.search("", {
        limit: 0,
        facets: buildFacetRequest(),
      })
    } catch (error) {
      const unsupportedFacet = getUnsupportedFacet(error)

      if (!unsupportedFacet || !FACETS_TO_REQUEST.includes(unsupportedFacet)) {
        throw error
      }

      excludedFacets = [unsupportedFacet]
      console.warn(
        `Meilisearch index does not expose filterable ${unsupportedFacet}; retrying facets without that facet`,
        error
      )

      result = await index.search("", {
        limit: 0,
        facets: buildFacetRequest(excludedFacets),
      })
    }

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
