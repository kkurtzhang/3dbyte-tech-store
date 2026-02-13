/**
 * URL building utilities for consistent query string construction
 * across shop filtering and sorting components.
 */

export interface ShopQueryParams {
  q?: string
  category?: string
  collection?: string
  color?: string
  size?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
  page?: string | number
}

/**
 * Build a query string from shop filter/sort parameters.
 * Handles array serialization and proper encoding.
 */
export function buildShopQueryString(params: ShopQueryParams): string {
  const searchParams = new URLSearchParams()

  // Search query
  if (params.q) {
    searchParams.set("q", params.q)
  }

  // Categories (comma-separated)
  if (params.category) {
    searchParams.set("category", params.category)
  }

  // Collections (comma-separated)
  if (params.collection) {
    searchParams.set("collection", params.collection)
  }

  // Colors (comma-separated)
  if (params.color) {
    searchParams.set("color", params.color)
  }

  // Sizes (comma-separated)
  if (params.size) {
    searchParams.set("size", params.size)
  }

  // Price range
  if (params.minPrice) {
    searchParams.set("minPrice", params.minPrice)
  }

  if (params.maxPrice) {
    searchParams.set("maxPrice", params.maxPrice)
  }

  // Sort order
  if (params.sort) {
    searchParams.set("sort", params.sort)
  }

  // Page number
  if (params.page && params.page !== 1) {
    searchParams.set("page", String(params.page))
  }

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ""
}

/**
 * Parse current URL search params into typed ShopQueryParams.
 */
export function parseShopQueryString(searchParams: URLSearchParams): ShopQueryParams {
  return {
    q: searchParams.get("q") || undefined,
    category: searchParams.get("category") || undefined,
    collection: searchParams.get("collection") || undefined,
    color: searchParams.get("color") || undefined,
    size: searchParams.get("size") || undefined,
    minPrice: searchParams.get("minPrice") || undefined,
    maxPrice: searchParams.get("maxPrice") || undefined,
    sort: searchParams.get("sort") || undefined,
    page: searchParams.get("page") || undefined,
  }
}

/**
 * Build a full shop URL path with query string.
 */
export function buildShopUrl(params: ShopQueryParams): string {
  const queryString = buildShopQueryString(params)
  return `/shop${queryString}`
}
