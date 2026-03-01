"use client"

import Link from "next/link"
import { Accordion } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { ToggleFilter } from "./toggle-filter"
import { FilterSection } from "./filter-section"
import { ActiveFilterChips } from "./active-filter-chips"
import { PriceRangeSlider } from "./price-range-slider"
import { FacetOptionsSection } from "./facet-options-section"
import {
  FilterFacets,
  formatOptionLabel,
  EXCLUDED_OPTIONS,
} from "@/features/shop/types/filters"

export interface FilterSidebarProps {
  facets: FilterFacets | null
  className?: string
  hideFacets?: Array<
    "categories" | "brands" | "collections" | "onSale" | "inStock" | "price"
  >
  clearAllUrl?: string
  // Filter change handlers
  onCategoryChange?: (categoryId: string, checked: boolean) => void
  onBrandChange?: (brandId: string, checked: boolean) => void
  onCollectionChange?: (collectionId: string, checked: boolean) => void
  onSaleChange?: (checked: boolean) => void
  onInStockChange?: (checked: boolean) => void
  onPriceChange?: (min: number, max: number) => void
  onOptionChange?: (optionKey: string, value: string, checked: boolean) => void
  // Select all / clear handlers
  onSelectAllCategories?: () => void
  onClearCategories?: () => void
  onSelectAllBrands?: () => void
  onClearBrands?: () => void
  onSelectAllCollections?: () => void
  onClearCollections?: () => void
  onClearOption?: (optionKey: string) => void
  // Current filter state
  selectedCategories?: string[]
  selectedBrands?: string[]
  selectedCollections?: string[]
  selectedOnSale?: boolean
  selectedInStock?: boolean
  priceRange?: { min: number; max: number }
  selectedOptions?: Record<string, string[]>
  // Active filter chips handlers
  onRemoveFilter?: (type: string, value?: string) => void
}

export function FilterSidebar({
  facets,
  className,
  hideFacets = [],
  clearAllUrl,
  onCategoryChange,
  onBrandChange,
  onCollectionChange,
  onSaleChange,
  onInStockChange,
  onPriceChange,
  onOptionChange,
  onSelectAllCategories,
  onClearCategories,
  onSelectAllBrands,
  onClearBrands,
  onSelectAllCollections,
  onClearCollections,
  onClearOption,
  selectedCategories = [],
  selectedBrands = [],
  selectedCollections = [],
  selectedOnSale = false,
  selectedInStock = false,
  priceRange,
  selectedOptions = {},
  onRemoveFilter,
}: FilterSidebarProps) {
  if (!facets) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Filters</h3>
        </div>
        <div className="text-sm text-muted-foreground">Loading filters...</div>
      </div>
    )
  }

  const currentPriceRange = priceRange || facets.priceRange

  // Check if any filters are active
  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    selectedCollections.length > 0 ||
    selectedOnSale ||
    selectedInStock ||
    (currentPriceRange.min !== facets.priceRange.min ||
      currentPriceRange.max !== facets.priceRange.max) ||
    Object.values(selectedOptions).some((values) => values.length > 0)

  // Get onSale and inStock facet counts
  const onSaleTrueOption = facets.onSale.find((opt) => opt.value === "true")
  const inStockTrueOption = facets.inStock.find((opt) => opt.value === "true")

  // Filter dynamic options to exclude any in EXCLUDED_OPTIONS
  const filteredOptions = Object.entries(facets.options).filter(
    ([key]) => !EXCLUDED_OPTIONS.includes(key)
  )

  // Determine default open accordion items
  const defaultAccordionItems: string[] = []
  if (
    !hideFacets.includes("inStock") &&
    inStockTrueOption &&
    inStockTrueOption.count > 0
  )
    defaultAccordionItems.push("inStock")
  if (!hideFacets.includes("price")) defaultAccordionItems.push("price")
  if (!hideFacets.includes("categories") && facets.categories.length > 0)
    defaultAccordionItems.push("categories")
  if (!hideFacets.includes("brands") && facets.brands.length > 0)
    defaultAccordionItems.push("brands")
  if (!hideFacets.includes("collections") && facets.collections.length > 0)
    defaultAccordionItems.push("collections")
  if (
    !hideFacets.includes("onSale") &&
    onSaleTrueOption &&
    onSaleTrueOption.count > 0
  )
    defaultAccordionItems.push("onSale")
  // Open first two dynamic option sections by default
  filteredOptions.slice(0, 2).forEach(([key]) => defaultAccordionItems.push(key))

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {hasActiveFilters && clearAllUrl && (
          <Link
            href={clearAllUrl}
            className="text-xs font-mono text-primary hover:underline"
          >
            Clear All
          </Link>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && onRemoveFilter && (
        <ActiveFilterChips
          facets={facets}
          selectedCategories={selectedCategories}
          selectedBrands={selectedBrands}
          selectedCollections={selectedCollections}
          selectedOnSale={selectedOnSale}
          selectedInStock={selectedInStock}
          priceRange={currentPriceRange}
          selectedOptions={selectedOptions}
          onRemoveFilter={onRemoveFilter}
        />
      )}

      <Accordion
        type="multiple"
        defaultValue={defaultAccordionItems}
        className="w-full"
      >
        {/* In Stock Toggle - First position, checked by default */}
        {!hideFacets.includes("inStock") &&
          inStockTrueOption &&
          inStockTrueOption.count > 0 && (
            <FilterSection
              title="Availability"
              value="inStock"
              defaultOpen={true}
            >
              <ToggleFilter
                id="inStock-toggle"
                label="Show only in-stock items"
                count={inStockTrueOption.count}
                checked={selectedInStock}
                onChange={(checked) => onInStockChange?.(checked)}
              />
            </FilterSection>
          )}

        {/* Price Range */}
        {!hideFacets.includes("price") && (
          <FilterSection
            title={
              <span className="flex items-center">
                Price Range
                {(currentPriceRange.min !== facets.priceRange.min ||
                  currentPriceRange.max !== facets.priceRange.max) && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (${currentPriceRange.min} - ${currentPriceRange.max})
                  </span>
                )}
              </span>
            }
            value="price"
            defaultOpen={true}
          >
            <PriceRangeSlider
              min={facets.priceRange.min}
              max={facets.priceRange.max}
              currentMin={currentPriceRange.min}
              currentMax={currentPriceRange.max}
              onApply={(min, max) => onPriceChange?.(min, max)}
              onClear={() => onPriceChange?.(facets.priceRange.min, facets.priceRange.max)}
            />
          </FilterSection>
        )}

        {/* Categories */}
        {!hideFacets.includes("categories") && facets.categories.length > 0 && (
          <FacetOptionsSection
            title="Categories"
            value="categories"
            defaultOpen={true}
            options={facets.categories}
            selectedValues={selectedCategories}
            onChange={(value, checked) => onCategoryChange?.(value, checked)}
            onClear={onClearCategories}
            onSelectAll={onSelectAllCategories}
            selectedCount={selectedCategories.length || undefined}
          />
        )}

        {/* Brands */}
        {!hideFacets.includes("brands") && facets.brands.length > 0 && (
          <FacetOptionsSection
            title="Brands"
            value="brands"
            defaultOpen={true}
            options={facets.brands}
            selectedValues={selectedBrands}
            onChange={(value, checked) => onBrandChange?.(value, checked)}
            onClear={onClearBrands}
            onSelectAll={onSelectAllBrands}
            selectedCount={selectedBrands.length || undefined}
          />
        )}

        {/* Collections */}
        {!hideFacets.includes("collections") &&
          facets.collections.length > 0 && (
            <FacetOptionsSection
              title="Collections"
              value="collections"
              defaultOpen={true}
              options={facets.collections}
              selectedValues={selectedCollections}
              onChange={(value, checked) => onCollectionChange?.(value, checked)}
              onClear={onClearCollections}
              onSelectAll={onSelectAllCollections}
              selectedCount={selectedCollections.length || undefined}
            />
          )}

        {/* On Sale Toggle */}
        {!hideFacets.includes("onSale") &&
          onSaleTrueOption &&
          onSaleTrueOption.count > 0 && (
            <FilterSection title="On Sale" value="onSale" defaultOpen={true}>
              <ToggleFilter
                id="onSale-toggle"
                label="Show only sale items"
                count={onSaleTrueOption.count}
                checked={selectedOnSale}
                onChange={(checked) => onSaleChange?.(checked)}
              />
            </FilterSection>
          )}

        {/* Dynamic Options */}
        {filteredOptions.map(([optionKey, options]) => {
          const selectedValues = selectedOptions[optionKey] || []
          return (
            <FacetOptionsSection
              key={optionKey}
              value={optionKey}
              title={formatOptionLabel(optionKey)}
              options={options}
              selectedValues={selectedValues}
              onChange={(value, checked) => onOptionChange?.(optionKey, value, checked)}
              onClear={
                selectedValues.length > 0
                  ? () => onClearOption?.(optionKey)
                  : undefined
              }
              selectedCount={selectedValues.length || undefined}
            />
          )
        })}
      </Accordion>
    </div>
  )
}
