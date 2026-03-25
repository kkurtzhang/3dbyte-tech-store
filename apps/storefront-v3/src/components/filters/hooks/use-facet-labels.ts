"use client"

import { useEffect, useState } from "react"
import type { FacetLabels } from "@/lib/filters/facet-labels"

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
        const response = await fetch("/api/filter-labels")
        if (!response.ok) {
          throw new Error("Failed to load facet labels")
        }

        const nextLabels = (await response.json()) as FacetLabels

        if (isCancelled) return

        setLabels(nextLabels)
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
