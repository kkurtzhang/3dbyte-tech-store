"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { buildShopUrl, type ShopQueryParams } from "@/lib/utils/url"

export interface FilterOption {
  id: string
  label: string
  count?: number
}

export interface FilterGroup {
  id: string
  label: string
  options: FilterOption[]
}

// Hardcoded color options - can be made dynamic
const COLORS = [
  { id: "white", label: "White", hex: "#ffffff" },
  { id: "black", label: "Black", hex: "#000000" },
  { id: "red", label: "Red", hex: "#ef4444" },
  { id: "blue", label: "Blue", hex: "#3b82f6" },
  { id: "green", label: "Green", hex: "#22c55e" },
  { id: "yellow", label: "Yellow", hex: "#eab308" },
  { id: "purple", label: "Purple", hex: "#a855f7" },
  { id: "orange", label: "Orange", hex: "#f97316" },
  { id: "gray", label: "Gray", hex: "#6b7280" },
  { id: "pink", label: "Pink", hex: "#ec4899" },
]

// Hardcoded size options - can be made dynamic
const SIZES = [
  { id: "xs", label: "XS" },
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
  { id: "xl", label: "XL" },
  { id: "xxl", label: "XXL" },
]

export interface AdvancedShopFiltersProps {
  categories?: FilterGroup
  collections?: FilterGroup
  priceRange?: { min: number; max: number }
  className?: string
}

function FilterCheckbox({
  id,
  label,
  count,
  checked,
  onChange,
}: {
  id: string
  label: string
  count?: number
  checked: boolean
  onChange: (checked: boolean) => void
}) {
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

function ColorCheckbox({
  id,
  label,
  hex,
  checked,
  onChange,
}: {
  id: string
  label: string
  hex: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex flex-col items-center space-y-1">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-8 w-8 rounded-full border-2 transition-all",
          checked
            ? "border-primary ring-2 ring-primary ring-offset-2"
            : "border-border hover:border-primary/50",
          checked ? "ring-offset-background" : ""
        )}
        style={{ backgroundColor: hex }}
        aria-label={`Toggle ${label}`}
      >
        {checked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-4 w-4 text-white drop-shadow-md"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </button>
      <Label
        htmlFor={id}
        className="cursor-pointer text-xs font-medium text-muted-foreground"
      >
        {label}
      </Label>
    </div>
  )
}

export function AdvancedShopFilters({
  categories,
  collections,
  priceRange: propPriceRange = { min: 0, max: 500 },
  className,
}: AdvancedShopFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectedCategories = searchParams.get("category")?.split(",") || []
  const selectedCollections = searchParams.get("collection")?.split(",") || []
  const selectedColors = searchParams.get("color")?.split(",") || []
  const selectedSizes = searchParams.get("size")?.split(",") || []

  // Parse price range from URL
  const minPrice = Number(searchParams.get("minPrice")) || propPriceRange.min
  const maxPrice = Number(searchParams.get("maxPrice")) || propPriceRange.max

  // Local state for price range (before apply)
  const [localMinPrice, setLocalMinPrice] = useState(minPrice)
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice)

  const updateFilters = (params: ShopQueryParams) => {
    router.push(buildShopUrl(params))
  }

  const updateCategory = (categoryId: string, checked: boolean) => {
    let newCategories = selectedCategories.filter((c) => c !== categoryId)
    if (checked) {
      newCategories.push(categoryId)
    }

    updateFilters({
      q: searchParams.get("q") || undefined,
      category: newCategories.length > 0 ? newCategories.join(",") : undefined,
      collection: searchParams.get("collection") || undefined,
      color: searchParams.get("color") || undefined,
      size: searchParams.get("size") || undefined,
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      sort: searchParams.get("sort") || undefined,
      page: undefined,
    })
  }

  const updateCollection = (collectionId: string, checked: boolean) => {
    let newCollections = selectedCollections.filter((c) => c !== collectionId)
    if (checked) {
      newCollections.push(collectionId)
    }

    updateFilters({
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      collection: newCollections.length > 0 ? newCollections.join(",") : undefined,
      color: searchParams.get("color") || undefined,
      size: searchParams.get("size") || undefined,
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      sort: searchParams.get("sort") || undefined,
      page: undefined,
    })
  }

  const updateColor = (colorId: string, checked: boolean) => {
    let newColors = selectedColors.filter((c) => c !== colorId)
    if (checked) {
      newColors.push(colorId)
    }

    updateFilters({
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      collection: searchParams.get("collection") || undefined,
      color: newColors.length > 0 ? newColors.join(",") : undefined,
      size: searchParams.get("size") || undefined,
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      sort: searchParams.get("sort") || undefined,
      page: undefined,
    })
  }

  const updateSize = (sizeId: string, checked: boolean) => {
    let newSizes = selectedSizes.filter((s) => s !== sizeId)
    if (checked) {
      newSizes.push(sizeId)
    }

    updateFilters({
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      collection: searchParams.get("collection") || undefined,
      color: searchParams.get("color") || undefined,
      size: newSizes.length > 0 ? newSizes.join(",") : undefined,
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      sort: searchParams.get("sort") || undefined,
      page: undefined,
    })
  }

  const applyPriceRange = () => {
    updateFilters({
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      collection: searchParams.get("collection") || undefined,
      color: searchParams.get("color") || undefined,
      size: searchParams.get("size") || undefined,
      minPrice: localMinPrice > propPriceRange.min ? String(localMinPrice) : undefined,
      maxPrice: localMaxPrice < propPriceRange.max ? String(localMaxPrice) : undefined,
      sort: searchParams.get("sort") || undefined,
      page: undefined,
    })
  }

  const clearPriceRange = () => {
    setLocalMinPrice(propPriceRange.min)
    setLocalMaxPrice(propPriceRange.max)
    updateFilters({
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      collection: searchParams.get("collection") || undefined,
      color: searchParams.get("color") || undefined,
      size: searchParams.get("size") || undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sort: searchParams.get("sort") || undefined,
      page: undefined,
    })
  }

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedCollections.length > 0 ||
    selectedColors.length > 0 ||
    selectedSizes.length > 0 ||
    minPrice !== propPriceRange.min ||
    maxPrice !== propPriceRange.max

  const priceHasChanged =
    localMinPrice !== minPrice || localMaxPrice !== maxPrice

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

      <Accordion
        type="multiple"
        defaultValue={["price", "categories", "collections"]}
        className="w-full"
      >
        {/* Price Range */}
        <AccordionItem value="price">
          <AccordionTrigger className="py-3 text-sm font-medium hover:text-primary">
            Price Range
            {(minPrice !== propPriceRange.min || maxPrice !== propPriceRange.max) && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (${minPrice} - ${maxPrice})
              </span>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="px-2">
                <Slider
                  min={propPriceRange.min}
                  max={propPriceRange.max}
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
                    localMinPrice === propPriceRange.min &&
                    localMaxPrice === propPriceRange.max
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
        {categories && categories.options.length > 0 && (
          <AccordionItem value="categories">
            <AccordionTrigger className="py-3 text-sm font-medium hover:text-primary">
              {categories.label}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1">
                {categories.options.map((option) => (
                  <FilterCheckbox
                    key={option.id}
                    id={`category-${option.id}`}
                    label={option.label}
                    count={option.count}
                    checked={selectedCategories.includes(option.id)}
                    onChange={(checked) =>
                      updateCategory(option.id, checked)
                    }
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Collections */}
        {collections && collections.options.length > 0 && (
          <AccordionItem value="collections">
            <AccordionTrigger className="py-3 text-sm font-medium hover:text-primary">
              {collections.label}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1">
                {collections.options.map((option) => (
                  <FilterCheckbox
                    key={option.id}
                    id={`collection-${option.id}`}
                    label={option.label}
                    count={option.count}
                    checked={selectedCollections.includes(option.id)}
                    onChange={(checked) =>
                      updateCollection(option.id, checked)
                    }
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Colors */}
        <AccordionItem value="colors">
          <AccordionTrigger className="py-3 text-sm font-medium hover:text-primary">
            Color
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-5 gap-3">
              {COLORS.map((color) => (
                <ColorCheckbox
                  key={color.id}
                  id={`color-${color.id}`}
                  label={color.label}
                  hex={color.hex}
                  checked={selectedColors.includes(color.id)}
                  onChange={(checked) => updateColor(color.id, checked)}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Sizes */}
        <AccordionItem value="sizes">
          <AccordionTrigger className="py-3 text-sm font-medium hover:text-primary">
            Size
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => updateSize(size.id, !selectedSizes.includes(size.id))}
                  className={cn(
                    "rounded-md border py-2 text-sm font-medium transition-all",
                    selectedSizes.includes(size.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
