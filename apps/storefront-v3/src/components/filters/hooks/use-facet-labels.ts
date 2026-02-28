"use client"

import { useEffect, useState } from "react"
import { sdk } from "@/lib/medusa/client"
import { searchClient } from "@/lib/search/client"

export interface FacetLabels {
  categories: Record<string, string> // id -> name
  brands: Record<string, string> // id -> name
  collections: Record<string, string> // id -> title
}

/**
 * Hook to fetch human-readable labels for facet IDs
 *
 * Meilisearch only stores IDs (category_ids, brand.id, collection_ids),
 * so we need to fetch the actual names from Medusa/Meilisearch to display in the filter UI.
 *
 * - Categories: fetched from Medusa
 * - Collections: fetched from Medusa
 * - Brands: fetched from Meilisearch brands index
 */
export function useFacetLabels(): {
  labels: FacetLabels
  isLoading: boolean
} {
  const [labels, setLabels] = useState<FacetLabels>({
    categories: {},
    brands: {},
    collections: {},
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCancelled = false

    async function fetchLabels() {
      setIsLoading(true)

      try {
        // Fetch categories, collections from Medusa and brands from Meilisearch in parallel
        const [categoriesRes, collectionsRes, brandsRes] = await Promise.all([
          sdk.store.category.list({ limit: 100 }),
          sdk.store.collection.list({ limit: 100 }),
          // Fetch all brands from Meilisearch brands index
          searchClient.index("brands").search("", {
            limit: 1000,
            attributesToRetrieve: ["id", "name"],
          }),
        ])

        if (isCancelled) return

        const categories: Record<string, string> = {}
        categoriesRes.product_categories?.forEach((cat) => {
          categories[cat.id] = cat.name || cat.handle || cat.id
        })

        const collections: Record<string, string> = {}
        collectionsRes.collections?.forEach((col) => {
          collections[col.id] = col.title || col.handle || col.id
        })

        // Build brand ID -> name mapping from Meilisearch results
        const brands: Record<string, string> = {}
        brandsRes.hits.forEach((brand: unknown) => {
          const brandRecord = brand as { id: string; name: string }
          if (brandRecord.id && brandRecord.name) {
            brands[brandRecord.id] = brandRecord.name
          }
        })

        setLabels({ categories, brands, collections })
      } catch (error) {
        console.warn("Failed to fetch facet labels", error)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchLabels()

    return () => {
      isCancelled = true
    }
  }, [])

  return { labels, isLoading }
}
