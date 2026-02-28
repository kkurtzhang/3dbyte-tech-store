"use client"

import { useEffect, useState, useMemo } from "react"
import { searchClient, INDEX_PRODUCTS } from "@/lib/search/client"
import type { FilterFacets, FilterOption } from "@/features/shop/types/filters"
import type { FacetDistribution } from "@/lib/search/products"

export interface UseFilterFacetsOptions {
  indexName?: string
  query?: string
  filterOverrides?: string[]
}

export interface UseFilterFacetsResult {
  facets: FilterFacets | null
  isLoading: boolean
  error: Error | null
}

const FACETS_TO_REQUEST = [
  "brand.id",
  "category_ids",
  "collection_ids",
  "on_sale",
  "in_stock",
  "price_aud",
  "options_colour",
  "options_size",
  "options_nozzle_type",
  "options_nozzle_size",
]

/**
 * Hook to fetch filter facets from Meilisearch
 *
 * @param options - Configuration options
 * @returns Facets data with loading and error states
 */
export function useFilterFacets(
  options: UseFilterFacetsOptions = {}
): UseFilterFacetsResult {
  const { indexName = INDEX_PRODUCTS, query = "", filterOverrides } = options

  const [facets, setFacets] = useState<FilterFacets | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function fetchFacets() {
      setIsLoading(true)
      setError(null)

      try {
        const index = searchClient.index(indexName)

        const result = await index.search(query, {
          limit: 0,
          facets: FACETS_TO_REQUEST,
          filter: filterOverrides,
        })

        if (isCancelled) return

        const facetDistribution = result.facetDistribution as FacetDistribution

        // Transform raw facet distribution to FilterFacets format
        const categories: FilterOption[] = Object.entries(
          facetDistribution["category_ids"] || {}
        ).map(([id, count]) => ({
          value: id,
          label: id, // Will be mapped to human-readable name by parent
          count,
        }))

        const brands: FilterOption[] = Object.entries(
          facetDistribution["brand.id"] || {}
        ).map(([id, count]) => ({
          value: id,
          label: id,
          count,
        }))

        const collections: FilterOption[] = Object.entries(
          facetDistribution["collection_ids"] || {}
        ).map(([id, count]) => ({
          value: id,
          label: id,
          count,
        }))

        const onSale: FilterOption[] = Object.entries(
          facetDistribution["on_sale"] || {}
        ).map(([value, count]) => ({
          value,
          count,
        }))

        const inStock: FilterOption[] = Object.entries(
          facetDistribution["in_stock"] || {}
        ).map(([value, count]) => ({
          value,
          count,
        }))

        // Calculate price range
        const priceKeys = Object.keys(facetDistribution["price_aud"] || {}).map(
          Number
        )
        const priceRange = {
          min: priceKeys.length > 0 ? Math.min(...priceKeys) : 0,
          max: priceKeys.length > 0 ? Math.max(...priceKeys) : 1000,
        }

        // Transform dynamic options
        const options: Record<string, FilterOption[]> = {}
        Object.entries(facetDistribution).forEach(([key, distribution]) => {
          if (key.startsWith("options_") && distribution) {
            const filteredOpts = Object.entries(distribution)
              .filter(([, count]) => count > 0)
              .map(([value, count]) => ({
                value,
                count,
              }))
            if (filteredOpts.length > 0) {
              options[key] = filteredOpts
            }
          }
        })

        setFacets({
          categories,
          brands,
          collections,
          onSale,
          inStock,
          priceRange,
          options,
        })
      } catch (err) {
        if (isCancelled) return
        setError(err instanceof Error ? err : new Error("Failed to fetch facets"))
        setFacets(null)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchFacets()

    return () => {
      isCancelled = true
    }
  }, [indexName, query, filterOverrides?.join(",")])

  // Memoize facets to prevent unnecessary re-renders
  const memoizedFacets = useMemo(() => facets, [facets])

  return {
    facets: memoizedFacets,
    isLoading,
    error,
  }
}
