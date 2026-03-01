"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { FilterSidebar } from "./filter-sidebar"
import { useFilterFacets } from "./hooks/use-filter-facets"
import { useFacetLabels } from "./hooks/use-facet-labels"
import type { FilterFacets, FilterOption } from "@/features/shop/types/filters"

export interface CategoryFiltersProps {
  className?: string
  categoryId: string
  categoryHandle?: string
}

/**
 * Wrapper component for category page filters.
 * Hides the 'categories' facet since the user is already viewing a category.
 */
export function CategoryFilters({
  className,
  categoryId,
  categoryHandle,
}: CategoryFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Fetch facets with category filter to get accurate counts
  const { facets: rawFacets, isLoading: _isLoading } = useFilterFacets({
    filterOverrides: [`category_ids = ${categoryId}`],
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
      categories: rawFacets.categories, // Keep as-is (user is viewing a category)
      brands: applyLabels(rawFacets.brands, labels.brands),
      collections: applyLabels(rawFacets.collections, labels.collections),
    } as FilterFacets
  }, [rawFacets, labels])

  // Parse current filter selections from URL
  const selectedBrands = searchParams.get("brand")?.split(",").filter(Boolean) || []
  const selectedCollections = searchParams.get("collection")?.split(",").filter(Boolean) || []
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

  // Build category URL with query params
  const buildCategoryUrl = (params: URLSearchParams): string => {
    const queryString = params.toString()
    return categoryHandle
      ? `/categories/${categoryHandle}${queryString ? `?${queryString}` : ""}`
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

    router.push(buildCategoryUrl(params))
  }

  // Clear all filters and return to base category
  const clearAllUrl = categoryHandle
    ? `/categories/${categoryHandle}?inStock=true`
    : "?inStock=true"

  // Filter handlers
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

  const handleCollectionChange = (collectionId: string, checked: boolean) => {
    let newCollections = selectedCollections.filter((c) => c !== collectionId)
    if (checked) {
      newCollections.push(collectionId)
    }
    updateFilters({
      collection: newCollections.length > 0 ? newCollections.join(",") : undefined,
    })
  }

  const handleSelectAllCollections = () => {
    if (!facets) return
    const allCollectionIds = facets.collections.map((opt) => opt.value).join(",")
    updateFilters({ collection: allCollectionIds })
  }

  const handleClearCollections = () => {
    updateFilters({ collection: undefined })
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
      case "brand":
        if (value) {
          handleBrandChange(value, false)
        }
        break
      case "collection":
        if (value) {
          handleCollectionChange(value, false)
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
      hideFacets={["categories"]}
      clearAllUrl={clearAllUrl}
      selectedBrands={selectedBrands}
      selectedCollections={selectedCollections}
      selectedOnSale={selectedOnSale}
      selectedInStock={selectedInStock}
      priceRange={{ min: minPrice, max: maxPrice }}
      selectedOptions={selectedOptions}
      onBrandChange={handleBrandChange}
      onCollectionChange={handleCollectionChange}
      onSaleChange={handleOnSaleChange}
      onInStockChange={handleInStockChange}
      onPriceChange={handlePriceChange}
      onOptionChange={handleOptionChange}
      onSelectAllBrands={handleSelectAllBrands}
      onClearBrands={handleClearBrands}
      onSelectAllCollections={handleSelectAllCollections}
      onClearCollections={handleClearCollections}
      onClearOption={handleClearOption}
      onRemoveFilter={handleRemoveFilter}
    />
  )
}
