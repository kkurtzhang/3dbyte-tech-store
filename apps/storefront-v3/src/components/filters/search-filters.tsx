"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { FilterSidebar } from "./filter-sidebar"
import { useFilterFacets } from "./hooks/use-filter-facets"
import { useFacetLabels } from "./hooks/use-facet-labels"
import type { FilterFacets } from "@/features/shop/types/filters"

export interface SearchFiltersProps {
  className?: string
  searchQuery: string
}

/**
 * SearchFilters - Wrapper component for Search page filtering
 *
 * Handles URL state management and filter changes for the Search page.
 * Fetches facet data from Meilisearch with the search query applied.
 * Preserves the `q` parameter when updating filters.
 */
export function SearchFilters({ className, searchQuery }: SearchFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Parse inStock filter early (needed for facet filtering)
  const selectedInStock = searchParams.get("inStock") === "true"

  // Build filter overrides for facet fetching
  // Include inStock filter so facet counts reflect only in-stock items when selected
  const filterOverrides = useMemo(() => {
    const filters: string[] = []
    if (selectedInStock) {
      filters.push("in_stock = true")
    }
    return filters.length > 0 ? filters : undefined
  }, [selectedInStock])

  // Fetch facets from Meilisearch with search query and inStock filter
  const { facets, isLoading: _isLoading, error: _error } = useFilterFacets({
    query: searchQuery,
    filterOverrides,
  })

  // Fetch human-readable labels for facet IDs
  const { labels: facetLabels } = useFacetLabels()

  // Map facets to use human-readable labels instead of IDs
  const facetsWithLabels: FilterFacets | null = useMemo(() => {
    if (!facets) return null

    return {
      ...facets,
      categories: facets.categories.map((cat) => ({
        ...cat,
        label: facetLabels.categories[cat.value] || cat.label,
      })),
      brands: facets.brands.map((brand) => ({
        ...brand,
        label: facetLabels.brands[brand.value] || brand.label,
      })),
      collections: facets.collections.map((col) => ({
        ...col,
        label: facetLabels.collections[col.value] || col.label,
      })),
    }
  }, [facets, facetLabels])

  // Parse current filter selections from URL
  const selectedCategories = searchParams.get("category")?.split(",").filter(Boolean) || []
  const selectedBrands = searchParams.get("brand")?.split(",").filter(Boolean) || []
  const selectedCollections = searchParams.get("collection")?.split(",").filter(Boolean) || []
  const selectedOnSale = searchParams.get("onSale") === "true"
  // selectedInStock is already parsed above for facet filtering
  const minPrice = Number(searchParams.get("minPrice")) || facets?.priceRange.min || 0
  const maxPrice = Number(searchParams.get("maxPrice")) || facets?.priceRange.max || 1000

  // Parse dynamic options from URL (e.g., options_colour=Black,White)
  const selectedOptions = useMemo(() => {
    const options: Record<string, string[]> = {}
    searchParams.forEach((value, key) => {
      if (key.startsWith("options_")) {
        options[key] = value.split(",").filter(Boolean)
      }
    })
    return options
  }, [searchParams])

  // Local state for price range (before apply)
  const [localMinPrice, setLocalMinPrice] = useState(minPrice)
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice)

  // Sync local price state when URL changes
  useMemo(() => {
    setLocalMinPrice(minPrice)
    setLocalMaxPrice(maxPrice)
  }, [minPrice, maxPrice])

  // Build a search URL with query string
  const buildSearchUrl = (params: Record<string, string | number | undefined>): string => {
    const queryParams = new URLSearchParams()

    // Always preserve the search query
    if (searchQuery) {
      queryParams.set("q", searchQuery)
    }

    // Add other params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        queryParams.set(key, String(value))
      }
    })

    const queryString = queryParams.toString()
    return `/search${queryString ? `?${queryString}` : ""}`
  }

  // Get all current URL params for preserving during filter updates
  const getCurrentParams = (): Record<string, string | undefined> => {
    const params: Record<string, string | undefined> = {
      category: searchParams.get("category") || undefined,
      brand: searchParams.get("brand") || undefined,
      collection: searchParams.get("collection") || undefined,
      onSale: searchParams.get("onSale") || undefined,
      inStock: searchParams.get("inStock") || undefined,
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      sort: searchParams.get("sort") || undefined,
      page: undefined,
    }

    // Add dynamic options
    searchParams.forEach((value, key) => {
      if (key.startsWith("options_")) {
        params[key] = value || undefined
      }
    })

    return params
  }

  const updateFilters = (params: Record<string, string | number | undefined>) => {
    router.push(buildSearchUrl(params))
  }

  // Category handlers
  const updateCategory = (categoryId: string, checked: boolean) => {
    let newCategories = selectedCategories.filter((c) => c !== categoryId)
    if (checked) {
      newCategories.push(categoryId)
    }

    const params = getCurrentParams()
    updateFilters({
      ...params,
      category: newCategories.length > 0 ? newCategories.join(",") : undefined,
    })
  }

  const selectAllCategories = () => {
    if (!facets) return
    const allCategoryIds = facets.categories.map((opt) => opt.value).join(",")
    const params = getCurrentParams()
    updateFilters({
      ...params,
      category: allCategoryIds,
    })
  }

  const clearCategories = () => {
    const params = getCurrentParams()
    updateFilters({
      ...params,
      category: undefined,
    })
  }

  // Brand handlers
  const updateBrand = (brandId: string, checked: boolean) => {
    let newBrands = selectedBrands.filter((b) => b !== brandId)
    if (checked) {
      newBrands.push(brandId)
    }

    const params = getCurrentParams()
    updateFilters({
      ...params,
      brand: newBrands.length > 0 ? newBrands.join(",") : undefined,
    })
  }

  const selectAllBrands = () => {
    if (!facets) return
    const allBrandIds = facets.brands.map((opt) => opt.value).join(",")
    const params = getCurrentParams()
    updateFilters({
      ...params,
      brand: allBrandIds,
    })
  }

  const clearBrands = () => {
    const params = getCurrentParams()
    updateFilters({
      ...params,
      brand: undefined,
    })
  }

  // Collection handlers
  const updateCollection = (collectionId: string, checked: boolean) => {
    let newCollections = selectedCollections.filter((c) => c !== collectionId)
    if (checked) {
      newCollections.push(collectionId)
    }

    const params = getCurrentParams()
    updateFilters({
      ...params,
      collection: newCollections.length > 0 ? newCollections.join(",") : undefined,
    })
  }

  const selectAllCollections = () => {
    if (!facets) return
    const allCollectionIds = facets.collections.map((opt) => opt.value).join(",")
    const params = getCurrentParams()
    updateFilters({
      ...params,
      collection: allCollectionIds,
    })
  }

  const clearCollections = () => {
    const params = getCurrentParams()
    updateFilters({
      ...params,
      collection: undefined,
    })
  }

  // Toggle handlers
  const updateOnSale = (checked: boolean) => {
    const params = getCurrentParams()
    updateFilters({
      ...params,
      onSale: checked ? "true" : undefined,
    })
  }

  const updateInStock = (checked: boolean) => {
    const params = getCurrentParams()
    updateFilters({
      ...params,
      // Use "false" instead of undefined to prevent redirect from re-adding inStock=true
      inStock: checked ? "true" : "false",
    })
  }

  // Price range handlers
  const updatePrice = (min: number, max: number) => {
    const params = getCurrentParams()
    updateFilters({
      ...params,
      minPrice: min > (facets?.priceRange.min || 0) ? String(min) : undefined,
      maxPrice: max < (facets?.priceRange.max || 1000) ? String(max) : undefined,
    })
  }

  // Dynamic option handlers
  const updateOption = (optionKey: string, optionValue: string, checked: boolean) => {
    const currentValues = selectedOptions[optionKey] || []
    let newValues = currentValues.filter((v) => v !== optionValue)
    if (checked) {
      newValues.push(optionValue)
    }

    const params = getCurrentParams()
    const updatedParams = {
      ...params,
    } as Record<string, string | undefined>
    updatedParams[optionKey] = newValues.length > 0 ? newValues.join(",") : undefined

    updateFilters(updatedParams)
  }

  const clearOption = (optionKey: string) => {
    const params = getCurrentParams()
    const updatedParams = {
      ...params,
    } as Record<string, string | undefined>
    updatedParams[optionKey] = undefined
    updateFilters(updatedParams)
  }

  // Remove filter handlers for active chips
  const removeFilter = (type: string, value?: string) => {
    const params = getCurrentParams()

    switch (type) {
      case "category":
        if (value) {
          const newCategories = selectedCategories.filter((c) => c !== value)
          updateFilters({
            ...params,
            category: newCategories.length > 0 ? newCategories.join(",") : undefined,
          })
        }
        break
      case "brand":
        if (value) {
          const newBrands = selectedBrands.filter((b) => b !== value)
          updateFilters({
            ...params,
            brand: newBrands.length > 0 ? newBrands.join(",") : undefined,
          })
        }
        break
      case "collection":
        if (value) {
          const newCollections = selectedCollections.filter((c) => c !== value)
          updateFilters({
            ...params,
            collection: newCollections.length > 0 ? newCollections.join(",") : undefined,
          })
        }
        break
      case "onSale":
        updateFilters({
          ...params,
          onSale: undefined,
        })
        break
      case "inStock":
        updateFilters({
          ...params,
          inStock: "false",
        })
        break
      case "price":
        updateFilters({
          ...params,
          minPrice: undefined,
          maxPrice: undefined,
        })
        break
      default:
        // Dynamic options
        if (type.startsWith("options_") && value) {
          const currentValues = selectedOptions[type] || []
          const newValues = currentValues.filter((v) => v !== value)
          const updatedParams = {
            ...params,
          } as Record<string, string | undefined>
          updatedParams[type] = newValues.length > 0 ? newValues.join(",") : undefined
          updateFilters(updatedParams)
        } else if (type.startsWith("options_")) {
          const updatedParams = {
            ...params,
          } as Record<string, string | undefined>
          updatedParams[type] = undefined
          updateFilters(updatedParams)
        }
        break
    }
  }

  // Build clear all URL (preserves the search query and inStock=true by default)
  const clearAllUrl = searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}&inStock=true` : "/search?inStock=true"

  // Build current price range for display
  const currentPriceRange = facets
    ? {
        min: localMinPrice,
        max: localMaxPrice,
      }
    : undefined

  return (
    <FilterSidebar
      facets={facetsWithLabels}
      className={className}
      clearAllUrl={clearAllUrl}
      selectedCategories={selectedCategories}
      selectedBrands={selectedBrands}
      selectedCollections={selectedCollections}
      selectedOnSale={selectedOnSale}
      selectedInStock={selectedInStock}
      priceRange={currentPriceRange}
      selectedOptions={selectedOptions}
      onCategoryChange={updateCategory}
      onBrandChange={updateBrand}
      onCollectionChange={updateCollection}
      onSaleChange={updateOnSale}
      onInStockChange={updateInStock}
      onPriceChange={updatePrice}
      onOptionChange={updateOption}
      onSelectAllCategories={selectAllCategories}
      onClearCategories={clearCategories}
      onSelectAllBrands={selectAllBrands}
      onClearBrands={clearBrands}
      onSelectAllCollections={selectAllCollections}
      onClearCollections={clearCollections}
      onClearOption={clearOption}
      onRemoveFilter={removeFilter}
    />
  )
}
