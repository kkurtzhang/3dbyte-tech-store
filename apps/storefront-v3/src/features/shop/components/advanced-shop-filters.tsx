"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useMemo } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { buildShopUrl, type ShopQueryParams } from "@/lib/utils/url"
import {
  FilterFacets,
  formatOptionLabel,
  EXCLUDED_OPTIONS,
} from "@/features/shop/types/filters"

export interface AdvancedShopFiltersProps {
  facets: FilterFacets
  className?: string
}

interface FilterCheckboxProps {
  id: string
  label: string
  count?: number
  checked: boolean
  onChange: (checked: boolean) => void
}

function FilterCheckbox({
  id,
  label,
  count,
  checked,
  onChange,
}: FilterCheckboxProps) {
  return (
    <div className="flex items-center space-x-2 py-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="border-primary/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
      />
      <Label
        htmlFor={id}
        className="flex flex-1 cursor-pointer text-sm font-normal"
      >
        <span className="flex-1">{label}</span>
        {count !== undefined && (
          <span className="font-mono text-xs text-muted-foreground">
            ({count})
          </span>
        )}
      </Label>
    </div>
  )
}

interface RadioFilterButtonProps {
  id: string
  label: string
  count?: number
  checked: boolean
  onChange: (checked: boolean) => void
}

function RadioFilterButton({
  id,
  label,
  count,
  checked,
  onChange,
}: RadioFilterButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-all",
        checked
          ? "border-primary bg-primary/10 text-primary"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className="font-mono text-xs text-muted-foreground">
          ({count})
        </span>
      )}
    </button>
  )
}

interface ToggleFilterProps {
  id: string
  label: string
  count?: number
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleFilter({
  id,
  label,
  count,
  checked,
  onChange,
}: ToggleFilterProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm font-normal">
        <span>{label}</span>
        {count !== undefined && (
          <span className="font-mono text-xs text-muted-foreground">
            ({count})
          </span>
        )}
      </Label>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="border-primary/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
      />
    </div>
  )
}

export function AdvancedShopFilters({
  facets,
  className,
}: AdvancedShopFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Parse current filter selections from URL
  const selectedCategories = searchParams.get("category")?.split(",").filter(Boolean) || []
  const selectedBrands = searchParams.get("brand")?.split(",").filter(Boolean) || []
  const selectedCollections = searchParams.get("collection")?.split(",").filter(Boolean) || []
  const selectedOnSale = searchParams.get("onSale") === "true"
  const selectedInStock = searchParams.get("inStock") === "true"
  const minPrice = Number(searchParams.get("minPrice")) || facets.priceRange.min
  const maxPrice = Number(searchParams.get("maxPrice")) || facets.priceRange.max

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

  // Get all current URL params for preserving during filter updates
  const getCurrentParams = (): ShopQueryParams => {
    const params: ShopQueryParams = {
      q: searchParams.get("q") || undefined,
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
      inStock: checked ? "true" : undefined,
    })
  }

  const updateOption = (optionKey: string, optionValue: string, checked: boolean) => {
    const currentValues = selectedOptions[optionKey] || []
    let newValues = currentValues.filter((v) => v !== optionValue)
    if (checked) {
      newValues.push(optionValue)
    }

    const params = getCurrentParams()
    // Update the specific option key
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

  const applyPriceRange = () => {
    const params = getCurrentParams()
    updateFilters({
      ...params,
      minPrice: localMinPrice > facets.priceRange.min ? String(localMinPrice) : undefined,
      maxPrice: localMaxPrice < facets.priceRange.max ? String(localMaxPrice) : undefined,
    })
  }

  const clearPriceRange = () => {
    setLocalMinPrice(facets.priceRange.min)
    setLocalMaxPrice(facets.priceRange.max)
    const params = getCurrentParams()
    updateFilters({
      ...params,
      minPrice: undefined,
      maxPrice: undefined,
    })
  }

  // Remove individual filter values
  const removeCategory = (categoryId: string) => {
    const newCategories = selectedCategories.filter((c) => c !== categoryId)
    const params = getCurrentParams()
    updateFilters({
      ...params,
      category: newCategories.length > 0 ? newCategories.join(",") : undefined,
    })
  }

  const removeBrand = (brandId: string) => {
    const newBrands = selectedBrands.filter((b) => b !== brandId)
    const params = getCurrentParams()
    updateFilters({
      ...params,
      brand: newBrands.length > 0 ? newBrands.join(",") : undefined,
    })
  }

  const removeCollection = (collectionId: string) => {
    const newCollections = selectedCollections.filter((c) => c !== collectionId)
    const params = getCurrentParams()
    updateFilters({
      ...params,
      collection: newCollections.length > 0 ? newCollections.join(",") : undefined,
    })
  }

  const removeOnSale = () => {
    const params = getCurrentParams()
    updateFilters({
      ...params,
      onSale: undefined,
    })
  }

  const removeInStock = () => {
    const params = getCurrentParams()
    updateFilters({
      ...params,
      inStock: undefined,
    })
  }

  const removePriceRange = () => {
    const params = getCurrentParams()
    updateFilters({
      ...params,
      minPrice: undefined,
      maxPrice: undefined,
    })
  }

  const removeOption = (optionKey: string, optionValue: string) => {
    const currentValues = selectedOptions[optionKey] || []
    const newValues = currentValues.filter((v) => v !== optionValue)

    const params = getCurrentParams()
    const updatedParams = {
      ...params,
    } as Record<string, string | undefined>
    updatedParams[optionKey] = newValues.length > 0 ? newValues.join(",") : undefined

    updateFilters(updatedParams as ShopQueryParams)
  }

  // Check if any filters are active
  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    selectedCollections.length > 0 ||
    selectedOnSale ||
    selectedInStock ||
    minPrice !== facets.priceRange.min ||
    maxPrice !== facets.priceRange.max ||
    Object.values(selectedOptions).some((values) => values.length > 0)

  const priceHasChanged =
    localMinPrice !== minPrice || localMaxPrice !== maxPrice

  // Get onSale and inStock facet counts
  const onSaleTrueOption = facets.onSale.find((opt) => opt.value === "true")
  const inStockTrueOption = facets.inStock.find((opt) => opt.value === "true")

  // Filter dynamic options to exclude any in EXCLUDED_OPTIONS
  // Note: Server already filters out options with 0 count
  const filteredOptions = Object.entries(facets.options).filter(
    ([key]) => !EXCLUDED_OPTIONS.includes(key)
  )

  // Determine default open accordion items
  // In Stock is first and always open by default
  const defaultAccordionItems: string[] = []
  if (inStockTrueOption && inStockTrueOption.count > 0) defaultAccordionItems.push("inStock")
  defaultAccordionItems.push("price")
  if (facets.categories.length > 0) defaultAccordionItems.push("categories")
  if (facets.brands.length > 0) defaultAccordionItems.push("brands")
  if (facets.collections.length > 0) defaultAccordionItems.push("collections")
  if (onSaleTrueOption && onSaleTrueOption.count > 0) defaultAccordionItems.push("onSale")
  // Open first two dynamic option sections by default
  filteredOptions.slice(0, 2).forEach(([key]) => defaultAccordionItems.push(key))

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Link
            href="/shop"
            className="text-xs font-mono text-primary hover:underline"
          >
            Clear All
          </Link>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCategories.map((id) => {
            const cat = facets.categories.find((c) => c.value === id)
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs"
              >
                Category: {cat?.label || id}
                <button
                  onClick={() => removeCategory(id)}
                  className="hover:text-primary ml-1"
                  aria-label={`Remove ${cat?.label || id} category`}
                >
                  ×
                </button>
              </span>
            )
          })}
          {selectedBrands.map((id) => {
            const brand = facets.brands.find((b) => b.value === id)
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs"
              >
                Brand: {brand?.label || id}
                <button
                  onClick={() => removeBrand(id)}
                  className="hover:text-primary ml-1"
                  aria-label={`Remove ${brand?.label || id} brand`}
                >
                  ×
                </button>
              </span>
            )
          })}
          {selectedCollections.map((id) => {
            const collection = facets.collections.find((c) => c.value === id)
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs"
              >
                Collection: {collection?.label || id}
                <button
                  onClick={() => removeCollection(id)}
                  className="hover:text-primary ml-1"
                  aria-label={`Remove ${collection?.label || id} collection`}
                >
                  ×
                </button>
              </span>
            )
          })}
          {selectedOnSale && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
              On Sale
              <button
                onClick={removeOnSale}
                className="hover:text-primary ml-1"
                aria-label="Remove on sale filter"
              >
                ×
              </button>
            </span>
          )}
          {selectedInStock && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
              In Stock
              <button
                onClick={removeInStock}
                className="hover:text-primary ml-1"
                aria-label="Remove in stock filter"
              >
                ×
              </button>
            </span>
          )}
          {(minPrice !== facets.priceRange.min || maxPrice !== facets.priceRange.max) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
              Price: ${minPrice} - ${maxPrice}
              <button
                onClick={removePriceRange}
                className="hover:text-primary ml-1"
                aria-label="Remove price range filter"
              >
                ×
              </button>
            </span>
          )}
          {Object.entries(selectedOptions).map(([optionKey, values]) =>
            values.map((value) => (
              <span
                key={`${optionKey}-${value}`}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs"
              >
                {formatOptionLabel(optionKey)}: {value}
                <button
                  onClick={() => removeOption(optionKey, value)}
                  className="hover:text-primary ml-1"
                  aria-label={`Remove ${value} ${formatOptionLabel(optionKey)}`}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      )}

      <Accordion
        type="multiple"
        defaultValue={defaultAccordionItems}
        className="w-full"
      >
        {/* In Stock Toggle - First position, checked by default */}
        {inStockTrueOption && inStockTrueOption.count > 0 && (
          <AccordionItem value="inStock">
            <AccordionTrigger className="py-3 text-sm font-medium hover:text-primary">
              Availability
            </AccordionTrigger>
            <AccordionContent>
              <ToggleFilter
                id="inStock-toggle"
                label="Show only in-stock items"
                count={inStockTrueOption.count}
                checked={selectedInStock}
                onChange={updateInStock}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Price Range */}
        <AccordionItem value="price">
          <AccordionTrigger className="py-3 text-sm font-medium hover:text-primary">
            Price Range
            {(minPrice !== facets.priceRange.min || maxPrice !== facets.priceRange.max) && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (${minPrice} - ${maxPrice})
              </span>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="px-2">
                <Slider
                  min={facets.priceRange.min}
                  max={facets.priceRange.max}
                  step={10}
                  value={[localMinPrice, localMaxPrice]}
                  onValueChange={([min, max]) => {
                    setLocalMinPrice(min)
                    setLocalMaxPrice(max)
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>${localMinPrice}</span>
                <span>${localMaxPrice}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearPriceRange}
                  className="flex-1 h-8 text-xs"
                  disabled={
                    localMinPrice === facets.priceRange.min &&
                    localMaxPrice === facets.priceRange.max
                  }
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={applyPriceRange}
                  className="flex-1 h-8 text-xs"
                  disabled={!priceHasChanged}
                >
                  Apply
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Categories */}
        {facets.categories.length > 0 && (
          <AccordionItem value="categories">
            <AccordionTrigger className="py-3 text-sm font-medium hover:text-primary">
              <span>Categories</span>
              {selectedCategories.length > 0 && (
                <>
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({selectedCategories.length} selected)
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      clearCategories()
                    }}
                    className="ml-auto mr-2 text-xs text-muted-foreground hover:text-primary"
                  >
                    Clear
                  </button>
                </>
              )}
              <div
                className="ml-auto flex gap-1 mr-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={selectAllCategories}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  All
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  onClick={clearCategories}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  None
                </button>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1">
                {facets.categories.map((option) => (
                  <FilterCheckbox
                    key={option.value}
                    id={`category-${option.value}`}
                    label={option.label || option.value}
                    count={option.count}
                    checked={selectedCategories.includes(option.value)}
                    onChange={(checked) => updateCategory(option.value, checked)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Brands - Multi Select */}
        {facets.brands.length > 0 && (
          <AccordionItem value="brands">
            <AccordionTrigger className="py-3 text-sm font-medium hover:text-primary">
              <span>Brands</span>
              {selectedBrands.length > 0 && (
                <>
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({selectedBrands.length} selected)
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      clearBrands()
                    }}
                    className="ml-auto mr-2 text-xs text-muted-foreground hover:text-primary"
                  >
                    Clear
                  </button>
                </>
              )}
              <div
                className="ml-auto flex gap-1 mr-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={selectAllBrands}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  All
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  onClick={clearBrands}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  None
                </button>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1">
                {facets.brands.map((option) => (
                  <FilterCheckbox
                    key={option.value}
                    id={`brand-${option.value}`}
                    label={option.label || option.value}
                    count={option.count}
                    checked={selectedBrands.includes(option.value)}
                    onChange={(checked) => updateBrand(option.value, checked)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Collections - Multi Select */}
        {facets.collections.length > 0 && (
          <AccordionItem value="collections">
            <AccordionTrigger className="py-3 text-sm font-medium hover:text-primary">
              <span>Collections</span>
              {selectedCollections.length > 0 && (
                <>
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({selectedCollections.length} selected)
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      clearCollections()
                    }}
                    className="ml-auto mr-2 text-xs text-muted-foreground hover:text-primary"
                  >
                    Clear
                  </button>
                </>
              )}
              <div
                className="ml-auto flex gap-1 mr-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={selectAllCollections}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  All
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  onClick={clearCollections}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  None
                </button>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1">
                {facets.collections.map((option) => (
                  <FilterCheckbox
                    key={option.value}
                    id={`collection-${option.value}`}
                    label={option.label || option.value}
                    count={option.count}
                    checked={selectedCollections.includes(option.value)}
                    onChange={(checked) => updateCollection(option.value, checked)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* On Sale Toggle */}
        {onSaleTrueOption && onSaleTrueOption.count > 0 && (
          <AccordionItem value="onSale">
            <AccordionTrigger className="py-3 text-sm font-medium hover:text-primary">
              On Sale
            </AccordionTrigger>
            <AccordionContent>
              <ToggleFilter
                id="onSale-toggle"
                label="Show only sale items"
                count={onSaleTrueOption.count}
                checked={selectedOnSale}
                onChange={updateOnSale}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Dynamic Options */}
        {filteredOptions.map(([optionKey, options]) => {
            const selectedValues = selectedOptions[optionKey] || []
            return (
              <AccordionItem key={optionKey} value={optionKey}>
                <AccordionTrigger className="py-3 text-sm font-medium hover:text-primary">
                  {formatOptionLabel(optionKey)}
                  {selectedValues.length > 0 && (
                    <>
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({selectedValues.length} selected)
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          clearOption(optionKey)
                        }}
                        className="ml-auto mr-2 text-xs text-muted-foreground hover:text-primary"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1">
                    {options.map((option) => (
                      <FilterCheckbox
                        key={option.value}
                        id={`${optionKey}-${option.value}`}
                        label={option.value}
                        count={option.count}
                        checked={selectedValues.includes(option.value)}
                        onChange={(checked) =>
                          updateOption(optionKey, option.value, checked)
                        }
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
      </Accordion>
    </div>
  )
}
