"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { FilterSidebar } from "./filter-sidebar"
import { useFilterFacets } from "./hooks/use-filter-facets"
import { useFacetLabels } from "./hooks/use-facet-labels"
import type { FilterFacets, FilterOption } from "@/features/shop/types/filters"

export interface CollectionFiltersProps {
  className?: string
  collectionId: string
  collectionHandle?: string
}

/**
 * Wrapper component for collection page filters.
 * Hides the 'collections' facet since the user is already viewing a collection.
 */
export function CollectionFilters({
  className,
  collectionId,
  collectionHandle,
}: CollectionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Fetch facets with collection filter to get accurate counts
  const { facets: rawFacets, isLoading: _isLoading } = useFilterFacets({
    filterOverrides: [`collection_ids = ${collectionId}`],
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
      brands: applyLabels(rawFacets.brands, labels.brands),
      collections: rawFacets.collections, // Keep as-is (user is viewing a collection)
    } as FilterFacets
  }, [rawFacets, labels])

  // Parse current filter selections from URL
  const selectedCategories = searchParams.get("category")?.split(",").filter(Boolean) || []
  const selectedBrands = searchParams.get("brand")?.split(",").filter(Boolean) || []
  const selectedOnSale = searchParams.get("onSale") === "true"
  const selectedInStock = searchParams.get("inStock") === "true"
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

  // Build collection URL with query params
  const buildCollectionUrl = (params: URLSearchParams): string => {
    const queryString = params.toString()
    return collectionHandle
      ? `/collections/${collectionHandle}${queryString ? `?${queryString}` : ""}`
      : queryString
        ? `?${queryString}`
        : ""
  }

  // Update URL with new filter params
  const updateFilters = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())

    // Update each param
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    })

    // Reset to page 1 when filters change
    params.delete("page")

    router.push(buildCollectionUrl(params))
  }

  // Clear all filters and return to base collection
  const clearAllUrl = collectionHandle
    ? `/collections/${collectionHandle}?inStock=true`
    : "?inStock=true"

  // Filter handlers
  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    let newCategories = selectedCategories.filter((c) => c !== categoryId)
    if (checked) {
      newCategories.push(categoryId)
    }
    updateFilters({
      category: newCategories.length > 0 ? newCategories.join(",") : undefined,
    })
  }

  const handleSelectAllCategories = () => {
    if (!facets) return
    const allCategoryIds = facets.categories.map((opt) => opt.value).join(",")
    updateFilters({ category: allCategoryIds })
  }

  const handleClearCategories = () => {
    updateFilters({ category: undefined })
  }

  const handleBrandChange = (brandId: string, checked: boolean) => {
    let newBrands = selectedBrands.filter((b) => b !== brandId)
    if (checked) {
      newBrands.push(brandId)
    }
    updateFilters({
      brand: newBrands.length > 0 ? newBrands.join(",") : undefined,
    })
  }

  const handleSelectAllBrands = () => {
    if (!facets) return
    const allBrandIds = facets.brands.map((opt) => opt.value).join(",")
    updateFilters({ brand: allBrandIds })
  }

  const handleClearBrands = () => {
    updateFilters({ brand: undefined })
  }

  const handleOnSaleChange = (checked: boolean) => {
    updateFilters({ onSale: checked ? "true" : undefined })
  }

  const handleInStockChange = (checked: boolean) => {
    updateFilters({ inStock: checked ? "true" : "false" })
  }

  const handlePriceChange = (min: number, max: number) => {
    updateFilters({
      minPrice: min > (facets?.priceRange.min || 0) ? String(min) : undefined,
      maxPrice: max < (facets?.priceRange.max || 1000) ? String(max) : undefined,
    })
  }

  const handleOptionChange = (optionKey: string, value: string, checked: boolean) => {
    const currentValues = selectedOptions[optionKey] || []
    let newValues = currentValues.filter((v) => v !== value)
    if (checked) {
      newValues.push(value)
    }
    updateFilters({ [optionKey]: newValues.length > 0 ? newValues.join(",") : undefined })
  }

  const handleClearOption = (optionKey: string) => {
    updateFilters({ [optionKey]: undefined })
  }

  const handleRemoveFilter = (type: string, value?: string) => {
    switch (type) {
      case "category":
        if (value) {
          handleCategoryChange(value, false)
        }
        break
      case "brand":
        if (value) {
          handleBrandChange(value, false)
        }
        break
      case "onSale":
        handleOnSaleChange(false)
        break
      case "inStock":
        handleInStockChange(false)
        break
      case "price":
        handlePriceChange(facets?.priceRange.min || 0, facets?.priceRange.max || 1000)
        break
      default:
        if (value && type.startsWith("options_")) {
          handleOptionChange(type, value, false)
        }
    }
  }

  return (
    <FilterSidebar
      facets={facets}
      className={className}
      hideFacets={["collections"]}
      clearAllUrl={clearAllUrl}
      selectedCategories={selectedCategories}
      selectedBrands={selectedBrands}
      selectedOnSale={selectedOnSale}
      selectedInStock={selectedInStock}
      priceRange={{ min: minPrice, max: maxPrice }}
      selectedOptions={selectedOptions}
      onCategoryChange={handleCategoryChange}
      onBrandChange={handleBrandChange}
      onSaleChange={handleOnSaleChange}
      onInStockChange={handleInStockChange}
      onPriceChange={handlePriceChange}
      onOptionChange={handleOptionChange}
      onSelectAllCategories={handleSelectAllCategories}
      onClearCategories={handleClearCategories}
      onSelectAllBrands={handleSelectAllBrands}
      onClearBrands={handleClearBrands}
      onClearOption={handleClearOption}
      onRemoveFilter={handleRemoveFilter}
    />
  )
}
