"use client"

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// Hardcoded for V3 MVP - will be dynamic from Meilisearch facets later
const CATEGORIES = ["Filament", "Resin", "Printers", "Parts", "Accessories"]
const MATERIALS = ["PLA", "ABS", "PETG", "TPU", "Nylon", "Resin"]
const DIAMETERS = ["1.75mm", "2.85mm"]

interface SearchFiltersProps {
  className?: string
}

export function SearchFilters({ className }: SearchFiltersProps) {
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

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-4">
        <h3 className="font-mono text-sm font-bold tracking-tight">CATEGORY</h3>
        <div className="space-y-2">
          {CATEGORIES.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`cat-${category}`}
                checked={categories.includes(category)}
                onCheckedChange={() => toggleFilter(category, categories, setCategories)}
              />
              <Label
                htmlFor={`cat-${category}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="font-mono text-sm font-bold tracking-tight">MATERIAL</h3>
        <div className="space-y-2">
          {MATERIALS.map((material) => (
            <div key={material} className="flex items-center space-x-2">
              <Checkbox
                id={`mat-${material}`}
                checked={materials.includes(material)}
                onCheckedChange={() => toggleFilter(material, materials, setMaterials)}
              />
              <Label
                htmlFor={`mat-${material}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {material}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="font-mono text-sm font-bold tracking-tight">DIAMETER</h3>
        <div className="space-y-2">
          {DIAMETERS.map((diameter) => (
            <div key={diameter} className="flex items-center space-x-2">
              <Checkbox
                id={`dia-${diameter}`}
                checked={diameters.includes(diameter)}
                onCheckedChange={() => toggleFilter(diameter, diameters, setDiameters)}
              />
              <Label
                htmlFor={`dia-${diameter}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {diameter}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
