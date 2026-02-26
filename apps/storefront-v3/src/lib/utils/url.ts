/**
 * URL building utilities for consistent query string construction
 * across shop filtering and sorting components.
 */

export interface ShopQueryParams {
  q?: string
  category?: string
  collection?: string
  brand?: string
  onSale?: string
  inStock?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
  page?: string | number
  // Dynamic options (e.g., options_colour, options_size)
  [key: `options_${string}`]: string | undefined
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

  // Brand (single value)
  if (params.brand) {
    searchParams.set("brand", params.brand)
  }

  // On sale (boolean as string)
  if (params.onSale) {
    searchParams.set("onSale", params.onSale)
  }

  // In stock (boolean as string)
  if (params.inStock) {
    searchParams.set("inStock", params.inStock)
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

  // Dynamic options (e.g., options_colour, options_size)
  Object.entries(params).forEach(([key, value]) => {
    if (key.startsWith("options_") && value) {
      searchParams.set(key, value)
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ""
}

/**
 * Parse current URL search params into typed ShopQueryParams.
 */
export function parseShopQueryString(searchParams: URLSearchParams): ShopQueryParams {
  const params: ShopQueryParams = {
    q: searchParams.get("q") || undefined,
    category: searchParams.get("category") || undefined,
    collection: searchParams.get("collection") || undefined,
    brand: searchParams.get("brand") || undefined,
    onSale: searchParams.get("onSale") || undefined,
    inStock: searchParams.get("inStock") || undefined,
    minPrice: searchParams.get("minPrice") || undefined,
    maxPrice: searchParams.get("maxPrice") || undefined,
    sort: searchParams.get("sort") || undefined,
    page: searchParams.get("page") || undefined,
  }

  // Parse dynamic options (e.g., options_colour, options_size)
  searchParams.forEach((value, key) => {
    if (key.startsWith("options_")) {
      (params as Record<string, string | undefined>)[key] = value || undefined
    }
  })

  return params
}

/**
 * Build a full shop URL path with query string.
 */
export function buildShopUrl(params: ShopQueryParams): string {
  const queryString = buildShopQueryString(params)
  return `/shop${queryString}`
}
