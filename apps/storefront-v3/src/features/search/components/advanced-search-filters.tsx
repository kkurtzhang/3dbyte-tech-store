"use client"

import { useState } from "react"
import { useQueryState, parseAsArrayOf, parseAsString, parseAsInteger } from "nuqs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

// Hardcoded for V3 MVP - will be dynamic from Meilisearch facets later
const CATEGORIES = ["Filament", "Resin", "Printers", "Parts", "Accessories"]
const MATERIALS = ["PLA", "ABS", "PETG", "TPU", "Nylon", "Resin"]
const DIAMETERS = ["1.75mm", "2.85mm"]

// Hardcoded color options
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

// Hardcoded size options
const SIZES = [
  { id: "xs", label: "XS" },
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
  { id: "xl", label: "XL" },
  { id: "xxl", label: "XXL" },
]

interface AdvancedSearchFiltersProps {
  className?: string
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

export function AdvancedSearchFilters({ className }: AdvancedSearchFiltersProps) {
  const [categories, setCategories] = useQueryState(
    "category",
    parseAsArrayOf(parseAsString).withDefault([])
  )

  const [materials, setMaterials] = useQueryState(
    "material",
    parseAsArrayOf(parseAsString).withDefault([])
  )

  const [diameters, setDiameters] = useQueryState(
    "diameter",
    parseAsArrayOf(parseAsString).withDefault([])
  )

  const [colors, setColors] = useQueryState(
    "color",
    parseAsArrayOf(parseAsString).withDefault([])
  )

  const [sizes, setSizes] = useQueryState(
    "size",
    parseAsArrayOf(parseAsString).withDefault([])
  )

  const [minPrice, setMinPrice] = useQueryState(
    "minPrice",
    parseAsInteger.withDefault(0)
  )

  const [maxPrice, setMaxPrice] = useQueryState(
    "maxPrice",
    parseAsInteger.withDefault(500)
  )

  // Local state for price range (before apply)
  const [localMinPrice, setLocalMinPrice] = useState(minPrice)
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice)

  const toggleFilter = (
    value: string,
    current: string[],
    set: (value: string[] | null) => Promise<URLSearchParams>
  ) => {
    const newValues = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]

    set(newValues.length > 0 ? newValues : null)
  }

  const applyPriceRange = () => {
    setMinPrice(localMinPrice > 0 ? localMinPrice : null)
    setMaxPrice(localMaxPrice < 500 ? localMaxPrice : null)
  }

  const clearPriceRange = () => {
    setLocalMinPrice(0)
    setLocalMaxPrice(500)
    setMinPrice(null)
    setMaxPrice(null)
  }

  const priceHasChanged =
    localMinPrice !== minPrice || localMaxPrice !== maxPrice

  const hasActiveFilters =
    categories.length > 0 ||
    materials.length > 0 ||
    diameters.length > 0 ||
    colors.length > 0 ||
    sizes.length > 0 ||
    minPrice !== 0 ||
    maxPrice !== 500

  const clearAll = () => {
    setCategories(null)
    setMaterials(null)
    setDiameters(null)
    setColors(null)
    setSizes(null)
    setMinPrice(null)
    setMaxPrice(null)
    setLocalMinPrice(0)
    setLocalMaxPrice(500)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm font-bold">FILTERS</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs font-mono text-primary hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Price Range */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-sm font-bold tracking-tight">PRICE</h3>
          {(minPrice !== 0 || maxPrice !== 500) && (
            <span className="text-xs font-mono text-muted-foreground">
              ${minPrice} - ${maxPrice}
            </span>
          )}
        </div>
        <div className="space-y-4">
          <div className="px-2">
            <Slider
              min={0}
              max={500}
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
              disabled={localMinPrice === 0 && localMaxPrice === 500}
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
      </div>

      <Separator />

      {/* Categories */}
      <div className="space-y-4">
        <h3 className="font-mono text-sm font-bold tracking-tight">CATEGORY</h3>
        <div className="space-y-2">
          {CATEGORIES.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`cat-${category}`}
                checked={categories.includes(category)}
                onCheckedChange={() =>
                  toggleFilter(category, categories, setCategories)
                }
              />
              <Label
                htmlFor={`cat-${category}`}
                className="text-sm font-medium leading-none"
              >
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Materials */}
      <div className="space-y-4">
        <h3 className="font-mono text-sm font-bold tracking-tight">MATERIAL</h3>
        <div className="space-y-2">
          {MATERIALS.map((material) => (
            <div key={material} className="flex items-center space-x-2">
              <Checkbox
                id={`mat-${material}`}
                checked={materials.includes(material)}
                onCheckedChange={() =>
                  toggleFilter(material, materials, setMaterials)
                }
              />
              <Label
                htmlFor={`mat-${material}`}
                className="text-sm font-medium leading-none"
              >
                {material}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Diameters */}
      <div className="space-y-4">
        <h3 className="font-mono text-sm font-bold tracking-tight">DIAMETER</h3>
        <div className="space-y-2">
          {DIAMETERS.map((diameter) => (
            <div key={diameter} className="flex items-center space-x-2">
              <Checkbox
                id={`dia-${diameter}`}
                checked={diameters.includes(diameter)}
                onCheckedChange={() =>
                  toggleFilter(diameter, diameters, setDiameters)
                }
              />
              <Label
                htmlFor={`dia-${diameter}`}
                className="text-sm font-medium leading-none"
              >
                {diameter}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Colors */}
      <div className="space-y-4">
        <h3 className="font-mono text-sm font-bold tracking-tight">COLOR</h3>
        <div className="grid grid-cols-5 gap-3">
          {COLORS.map((color) => (
            <ColorCheckbox
              key={color.id}
              id={`color-${color.id}`}
              label={color.label}
              hex={color.hex}
              checked={colors.includes(color.id)}
              onChange={(checked) => {
                const newColors = checked
                  ? [...colors, color.id]
                  : colors.filter((c) => c !== color.id)
                setColors(newColors.length > 0 ? newColors : null)
              }}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Sizes */}
      <div className="space-y-4">
        <h3 className="font-mono text-sm font-bold tracking-tight">SIZE</h3>
        <div className="grid grid-cols-3 gap-2">
          {SIZES.map((size) => (
            <button
              key={size.id}
              type="button"
              onClick={() => {
                const newSizes = sizes.includes(size.id)
                  ? sizes.filter((s) => s !== size.id)
                  : [...sizes, size.id]
                setSizes(newSizes.length > 0 ? newSizes : null)
              }}
              className={cn(
                "rounded-md border py-2 text-sm font-medium transition-all",
                sizes.includes(size.id)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50"
              )}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
