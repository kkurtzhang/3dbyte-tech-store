"use server"

import { searchClient, INDEX_PRODUCTS } from "@/lib/search/client"

interface SearchOptions {
  limit?: number
  categories?: string[] | undefined
  materials?: string[] | undefined
  diameters?: string[] | undefined
  colors?: string[] | undefined
  sizes?: string[] | undefined
  minPrice?: number | undefined
  maxPrice?: number | undefined
  brands?: string[] | undefined
  inStock?: boolean | undefined
}

export async function searchProducts(query: string, options: SearchOptions = {}) {
  const { limit = 20, categories, minPrice, maxPrice, brands, inStock } = options

  try {
    const index = searchClient.index(INDEX_PRODUCTS)

    const filter: string[] = []

    // Use category_ids which is the actual filterable attribute in Meilisearch
    if (categories && categories.length > 0) {
      // Note: category_ids is an array, we filter by exact match
      filter.push(`category_ids IN [${categories.map(c => `"${c}"`).join(", ")}]`)
    }

    // Brand filter - use brand.id
    if (brands && brands.length > 0) {
      filter.push(`brand.id IN [${brands.map(b => `"${b}"`).join(", ")}]`)
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

    const result = await index.search(query, {
      limit,
      filter: filter.length > 0 ? filter.join(" AND ") : undefined,
      // Request actual fields from Meilisearch index
      attributesToRetrieve: [
        "id", "handle", "title", "thumbnail",
        "price_aud", "original_price_aud", "on_sale",
        "in_stock", "inventory_quantity",
        "categories", "category_ids", "brand"
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
      estimatedTotalHits: result.estimatedTotalHits,
    }
  } catch (error) {
    console.error("Search failed:", error)
    return { hits: [], estimatedTotalHits: 0 }
  }
}
