import { sdk } from "@/lib/medusa/client"
import { searchClient } from "@/lib/search/client"

export interface FacetLabels {
  categories: Record<string, string>
  brands: Record<string, string>
  collections: Record<string, string>
}

export async function getFacetLabels(): Promise<FacetLabels> {
  const [categoriesRes, collectionsRes, brandsRes] = await Promise.all([
    sdk.store.category.list({ limit: 100 }),
    sdk.store.collection.list({ limit: 100 }),
    searchClient.index("brands").search("", {
      limit: 1000,
      attributesToRetrieve: ["id", "name"],
    }),
  ])

  const categories: Record<string, string> = {}
  categoriesRes.product_categories?.forEach((category) => {
    categories[category.id] = category.name || category.handle || category.id
  })

  const collections: Record<string, string> = {}
  collectionsRes.collections?.forEach((collection) => {
    collections[collection.id] = collection.title || collection.handle || collection.id
  })

  const brands: Record<string, string> = {}
  brandsRes.hits.forEach((brand: unknown) => {
    const brandRecord = brand as { id: string; name: string }
    if (brandRecord.id && brandRecord.name) {
      brands[brandRecord.id] = brandRecord.name
    }
  })

  return {
    categories,
    brands,
    collections,
  }
}
