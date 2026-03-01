"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { FilterSidebar, type FilterSidebarProps } from "./filter-sidebar"
import { useFilterFacets } from "./hooks/use-filter-facets"
import { useFacetLabels } from "./hooks/use-facet-labels"
import type { FilterFacets, FilterOption } from "@/features/shop/types/filters"

export interface BrandFiltersProps {
  className?: string
  brandId: string // The current brand being viewed (pre-filters results)
}

/**
 * Wrapper component for Brand pages that provides filtering functionality.
 *
 * Key features:
 * - Hides the 'brands' facet (user is already viewing a specific brand)
 * - Pre-filters facets by the current brand
 * - Includes inStock filter in facet counts for accurate numbers
 * - Manages URL state for all filters (price, category, inStock, onSale, etc.)
 * - Builds clearAllUrl that returns to the current brand with default filters
 */
export function BrandFilters({ className, brandId }: BrandFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Parse current filter selections from URL first (needed for facet filtering)
  const selectedInStock = searchParams.get("inStock") === "true"

  // Build filter overrides for facet fetching
  // Include inStock filter so facet counts reflect only in-stock items when selected
  const filterOverrides = useMemo(() => {
    const filters = [`brand.id = ${brandId}`]
    if (selectedInStock) {
      filters.push("in_stock = true")
    }
    return filters
  }, [brandId, selectedInStock])

  // Fetch facets pre-filtered by the current brand and inStock state
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
      brands: rawFacets.brands, // Brands use brand name from Meilisearch
      collections: applyLabels(rawFacets.collections, labels.collections),
    } as FilterFacets
  }, [rawFacets, labels])

  // Parse current filter selections from URL
  const selectedCategories = searchParams.get("category")?.split(",").filter(Boolean) || []
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

  // Build URL params object preserving current state
  const getCurrentParams = () => {
    const params: Record<string, string | undefined> = {
      category: searchParams.get("category") || undefined,
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

  // Navigate to updated URL
  const navigate = (updates: Record<string, string | undefined>) => {
    const current = getCurrentParams()
    const merged = { ...current, ...updates }

    // Build query string
    const query = new URLSearchParams()
    Object.entries(merged).forEach(([key, value]) => {
      if (value !== undefined) {
        query.set(key, value)
      }
    })

    // Navigate, preserving current path (brand page)
    router.push(`${pathname}?${query.toString()}`)
  }

  // Filter change handlers
  const handleCategoryChange: FilterSidebarProps["onCategoryChange"] = (categoryId, checked) => {
    let newCategories = selectedCategories.filter((c) => c !== categoryId)
    if (checked) {
      newCategories.push(categoryId)
    }
    navigate({
      category: newCategories.length > 0 ? newCategories.join(",") : undefined,
    })
  }

  const handleSelectAllCategories = () => {
    if (!facets) return
    const allCategoryIds = facets.categories.map((opt) => opt.value).join(",")
    navigate({ category: allCategoryIds })
  }

  const handleClearCategories = () => {
    navigate({ category: undefined })
  }

  const handleCollectionChange: FilterSidebarProps["onCollectionChange"] = (
    collectionId,
    checked
  ) => {
    let newCollections = selectedCollections.filter((c) => c !== collectionId)
    if (checked) {
      newCollections.push(collectionId)
    }
    navigate({
      collection: newCollections.length > 0 ? newCollections.join(",") : undefined,
    })
  }

  const handleSelectAllCollections = () => {
    if (!facets) return
    const allCollectionIds = facets.collections.map((opt) => opt.value).join(",")
    navigate({ collection: allCollectionIds })
  }

  const handleClearCollections = () => {
    navigate({ collection: undefined })
  }

  const handleOnSaleChange: FilterSidebarProps["onSaleChange"] = (checked) => {
    navigate({ onSale: checked ? "true" : undefined })
  }

  const handleInStockChange: FilterSidebarProps["onInStockChange"] = (checked) => {
    navigate({ inStock: checked ? "true" : "false" })
  }

  const handlePriceChange: FilterSidebarProps["onPriceChange"] = (min, max) => {
    navigate({
      minPrice: min > (facets?.priceRange.min || 0) ? String(min) : undefined,
      maxPrice: max < (facets?.priceRange.max || 1000) ? String(max) : undefined,
    })
  }

  const handleOptionChange: FilterSidebarProps["onOptionChange"] = (
    optionKey,
    value,
    checked
  ) => {
    const currentValues = selectedOptions[optionKey] || []
    let newValues = currentValues.filter((v) => v !== value)
    if (checked) {
      newValues.push(value)
    }
    navigate({
      [optionKey]: newValues.length > 0 ? newValues.join(",") : undefined,
    })
  }

  const handleClearOption: FilterSidebarProps["onClearOption"] = (optionKey) => {
    navigate({ [optionKey]: undefined })
  }

  // Remove individual filter values
  const handleRemoveFilter: FilterSidebarProps["onRemoveFilter"] = (type, value?) => {
    switch (type) {
      case "category": {
        const newCategories = selectedCategories.filter((c) => c !== value)
        navigate({
          category: newCategories.length > 0 ? newCategories.join(",") : undefined,
        })
        break
      }
      case "collection": {
        const newCollections = selectedCollections.filter((c) => c !== value)
        navigate({
          collection: newCollections.length > 0 ? newCollections.join(",") : undefined,
        })
        break
      }
      case "onSale":
        navigate({ onSale: undefined })
        break
      case "inStock":
        navigate({ inStock: "false" })
        break
      case "price":
        navigate({ minPrice: undefined, maxPrice: undefined })
        break
      default:
        // Dynamic options
        if (value !== undefined) {
          const currentValues = selectedOptions[type] || []
          const newValues = currentValues.filter((v) => v !== value)
          navigate({
            [type]: newValues.length > 0 ? newValues.join(",") : undefined,
          })
        } else {
          navigate({ [type]: undefined })
        }
        break
    }
  }

  // Build clear all URL - returns to current brand with default filters
  const buildClearAllUrl = () => {
    return `${pathname}?inStock=true`
  }

  // Current price range
  const priceRange = facets
    ? { min: minPrice, max: maxPrice }
    : { min: 0, max: 1000 }

  return (
    <FilterSidebar
      facets={facets}
      className={className}
      hideFacets={["brands"]} // Hide brands facet - user is already viewing a brand
      clearAllUrl={buildClearAllUrl()}
      // Filter change handlers
      onCategoryChange={handleCategoryChange}
      onCollectionChange={handleCollectionChange}
      onSaleChange={handleOnSaleChange}
      onInStockChange={handleInStockChange}
      onPriceChange={handlePriceChange}
      onOptionChange={handleOptionChange}
      // Select all / clear handlers
      onSelectAllCategories={handleSelectAllCategories}
      onClearCategories={handleClearCategories}
      onSelectAllCollections={handleSelectAllCollections}
      onClearCollections={handleClearCollections}
      onClearOption={handleClearOption}
      // Current filter state
      selectedCategories={selectedCategories}
      selectedCollections={selectedCollections}
      selectedOnSale={selectedOnSale}
      selectedInStock={selectedInStock}
      priceRange={priceRange}
      selectedOptions={selectedOptions}
      // Active filter chips handler
      onRemoveFilter={handleRemoveFilter}
    />
  )
}
