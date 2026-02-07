"use server"

import { searchClient, INDEX_PRODUCTS, INDEX_CATEGORIES, INDEX_BRANDS } from "@/lib/search/client"

interface SearchOptions {
  limit?: number
  categories?: string[] | undefined
  materials?: string[] | undefined
  diameters?: string[] | undefined
}

export interface ProductHit {
  id: string
  handle: string
  title: string
  thumbnail?: string
  price?: number
  specs?: {
    material?: string
    diameter?: string
  }
}

export interface CategoryHit {
  id: string
  handle: string
  name: string
  description?: string
  product_count?: number
  breadcrumb?: Array<{ id: string; name: string; handle: string }>
}

export interface BrandHit {
  id: string
  handle: string
  name: string
  description?: string
  brand_logo?: string
  product_count?: number
}

export interface UnifiedSearchResult {
  products: ProductHit[]
  categories: CategoryHit[]
  brands: BrandHit[]
}

export async function searchProducts(query: string, options: SearchOptions = {}) {
  const { limit = 8, categories, materials, diameters } = options

  try {
    const index = searchClient.index(INDEX_PRODUCTS)

    const filter: string[] = []

    if (categories && categories.length > 0) {
      filter.push(`category IN [${categories.map(c => `"${c}"`).join(", ")}]`)
    }

    if (materials && materials.length > 0) {
      filter.push(`material IN [${materials.map(m => `"${m}"`).join(", ")}]`)
    }

    if (diameters && diameters.length > 0) {
      filter.push(`diameter IN [${diameters.map(d => `"${d}"`).join(", ")}]`)
    }

    const result = await index.search(query, {
      limit,
      filter: filter.length > 0 ? filter.join(" AND ") : undefined,
      attributesToRetrieve: ["id", "handle", "title", "thumbnail", "price", "specs"],
    })

    return {
      hits: result.hits as ProductHit[],
      estimatedTotalHits: result.estimatedTotalHits,
    }
  } catch (error) {
    console.error("Product search failed:", error)
    return { hits: [], estimatedTotalHits: 0 }
  }
}

export async function searchCategories(query: string = "", limit: number = 5) {
  try {
    const index = searchClient.index(INDEX_CATEGORIES)

    const result = await index.search(query, {
      limit,
      attributesToRetrieve: ["id", "handle", "name", "description", "product_count", "breadcrumb"],
    })

    return {
      hits: result.hits as CategoryHit[],
      estimatedTotalHits: result.estimatedTotalHits,
    }
  } catch (error) {
    console.error("Category search failed:", error)
    // Return empty result if index doesn't exist
    return { hits: [], estimatedTotalHits: 0 }
  }
}

export async function searchBrands(query: string = "", limit: number = 5) {
  try {
    const index = searchClient.index(INDEX_BRANDS)

    const result = await index.search(query, {
      limit,
      attributesToRetrieve: ["id", "handle", "name", "description", "brand_logo", "product_count"],
    })

    return {
      hits: result.hits as BrandHit[],
      estimatedTotalHits: result.estimatedTotalHits,
    }
  } catch (error) {
    console.error("Brand search failed:", error)
    return { hits: [], estimatedTotalHits: 0 }
  }
}

export async function searchAll(query: string): Promise<UnifiedSearchResult> {
  if (!query.trim()) {
    return { products: [], categories: [], brands: [] }
  }

  try {
    const [productsResult, categoriesResult, brandsResult] = await Promise.all([
      searchProducts(query, { limit: 6 }),
      searchCategories(query, { limit: 4 }),
      searchBrands(query, { limit: 4 }),
    ])

    return {
      products: productsResult.hits,
      categories: categoriesResult.hits,
      brands: brandsResult.hits,
    }
  } catch (error) {
    console.error("Unified search failed:", error)
    return { products: [], categories: [], brands: [] }
  }
}

export async function searchCollections(query: string = "", limit: number = 5) {
  try {
    const index = searchClient.index(INDEX_COLLECTIONS)

    const result = await index.search(query, {
      limit,
      attributesToRetrieve: ["id", "handle", "title", "description", "product_count"],
    })

    return {
      hits: result.hits,
      estimatedTotalHits: result.estimatedTotalHits,
    }
  } catch (error) {
    console.error("Collection search failed:", error)
    return { hits: [], estimatedTotalHits: 0 }
  }
}
