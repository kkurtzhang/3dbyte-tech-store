"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { FilterSidebar } from "./filter-sidebar"
import { useFilterFacets } from "./hooks/use-filter-facets"
import { useFacetLabels } from "./hooks/use-facet-labels"
import { buildShopUrl, type ShopQueryParams } from "@/lib/utils/url"
import type { FilterFacets, FilterOption } from "@/features/shop/types/filters"

export interface ShopFiltersProps {
  className?: string
}

/**
 * Build Meilisearch filter expressions from current selections
 *
 * This enables dynamic facets - when filters are selected, facet counts update
 * to reflect only the products matching the current selection.
 */
function buildFilterOverrides(
  selectedCategories: string[],
  selectedBrands: string[],
  selectedCollections: string[],
  selectedOnSale: boolean,
  selectedInStock: boolean,
  minPrice: number,
  maxPrice: number,
  selectedOptions: Record<string, string[]>
): string[] {
  const filters: string[] = []

  if (selectedCategories.length > 0) {
    filters.push(`category_ids IN [${selectedCategories.map((c) => `"${c}"`).join(", ")}]`)
  }

  if (selectedBrands.length > 0) {
    filters.push(`brand.id IN [${selectedBrands.map((b) => `"${b}"`).join(", ")}]`)
  }

  if (selectedCollections.length > 0) {
    filters.push(`collection_ids IN [${selectedCollections.map((c) => `"${c}"`).join(", ")}]`)
  }

  if (selectedOnSale) {
    filters.push("on_sale = true")
  }

  if (selectedInStock) {
    filters.push("in_stock = true")
  }

  if (minPrice > 0) {
    filters.push(`price_aud >= ${minPrice}`)
  }

  if (maxPrice < 10000) {
    filters.push(`price_aud <= ${maxPrice}`)
  }

  // Add dynamic options filters
  Object.entries(selectedOptions).forEach(([key, values]) => {
    if (values.length > 0) {
      filters.push(`${key} IN [${values.map((v) => `"${v}"`).join(", ")}]`)
    }
  })

  return filters
}

/**
 * ShopFilters - Wrapper component for Shop page filtering
 *
 * Handles URL state management and filter changes for the Shop page.
 * Fetches facet data from Meilisearch and provides it to FilterSidebar.
 *
 * Features:
 * - Dynamic facets: facet counts update based on current selections
 * - Human-readable labels for brands, categories, and collections
 */
export function ShopFilters({ className }: ShopFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Parse current filter selections from URL
  const selectedCategories = searchParams.get("category")?.split(",").filter(Boolean) || []
  const selectedBrands = searchParams.get("brand")?.split(",").filter(Boolean) || []
  const selectedCollections = searchParams.get("collection")?.split(",").filter(Boolean) || []
  const selectedOnSale = searchParams.get("onSale") === "true"
  const selectedInStock = searchParams.get("inStock") === "true"

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

  // Build filter overrides for dynamic facets
  // Note: We exclude the filter type itself when building overrides to allow selecting within that filter
  const filterOverrides = useMemo(() => {
    // For dynamic facets, we pass ALL current filters
    // This makes facet counts reflect what's available with current selections
    return buildFilterOverrides(
      selectedCategories,
      selectedBrands,
      selectedCollections,
      selectedOnSale,
      selectedInStock,
      0, // Don't filter by price for facet calculation
      10000, // Don't filter by price for facet calculation
      selectedOptions
    )
  }, [
    selectedCategories,
    selectedBrands,
    selectedCollections,
    selectedOnSale,
    selectedInStock,
    selectedOptions,
  ])

  // Fetch facets from Meilisearch with current filter selections for dynamic counts
  const { facets: rawFacets, isLoading: _isLoading, error: _error } = useFilterFacets({
    filterOverrides,
  })

  // Fetch labels for facet IDs
  const { labels } = useFacetLabels()

  // Transform facets to apply human-readable labels
  const facets = useMemo(() => {
    if (!rawFacets) return null

    const applyLabels = (options: FilterOption[], labelMap: Record<string, string>) =>
      options.map((opt) => ({
        ...opt,
        label: labelMap[opt.value] || opt.label || opt.value,
      }))

    return {
      ...rawFacets,
      categories: applyLabels(rawFacets.categories, labels.categories),
      brands: applyLabels(rawFacets.brands, labels.brands), // Now apply brand name labels
      collections: applyLabels(rawFacets.collections, labels.collections),
    } as FilterFacets
  }, [rawFacets, labels])

  const minPrice = Number(searchParams.get("minPrice")) || facets?.priceRange.min || 0
  const maxPrice = Number(searchParams.get("maxPrice")) || facets?.priceRange.max || 1000

  // Local state for price range (before apply)
  const [localMinPrice, setLocalMinPrice] = useState(minPrice)
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice)

  // Sync local price state when URL changes
  useMemo(() => {
    setLocalMinPrice(minPrice)
    setLocalMaxPrice(maxPrice)
  }, [minPrice, maxPrice])

  // Get all current URL params for preserving during filter updates
  const getCurrentParams = (): ShopQueryParams => {
    const params: ShopQueryParams = {
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
        (params as Record<string, string | undefined>)[key] = value || undefined
      }
    })

    return params
  }

  const updateFilters = (params: ShopQueryParams) => {
    router.push(buildShopUrl(params))
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

    updateFilters(updatedParams as ShopQueryParams)
  }

  const clearOption = (optionKey: string) => {
    const params = getCurrentParams()
    const updatedParams = {
      ...params,
    } as Record<string, string | undefined>
    updatedParams[optionKey] = undefined
    updateFilters(updatedParams as ShopQueryParams)
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
          updateFilters(updatedParams as ShopQueryParams)
        } else if (type.startsWith("options_")) {
          const updatedParams = {
            ...params,
          } as Record<string, string | undefined>
          updatedParams[type] = undefined
          updateFilters(updatedParams as ShopQueryParams)
        }
        break
    }
  }

  // Build clear all URL (preserves inStock=true by default)
  const clearAllUrl = "/shop?inStock=true"

  // Build current price range for display
  const currentPriceRange = facets
    ? {
        min: localMinPrice,
        max: localMaxPrice,
      }
    : undefined

  return (
    <FilterSidebar
      facets={facets}
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
