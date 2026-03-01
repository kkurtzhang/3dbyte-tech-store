"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
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

export interface ShopFiltersProps {
  categories?: FilterGroup
  collections?: FilterGroup
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

export function ShopFilters({
  categories,
  collections,
  className,
}: ShopFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectedCategories = searchParams.get("category")?.split(",") || []
  const selectedCollections = searchParams.get("collection")?.split(",") || []

  const updateCategory = (categoryId: string, checked: boolean) => {
    let newCategories = selectedCategories.filter((c) => c !== categoryId)
    if (checked) {
      newCategories.push(categoryId)
    }

    const params: ShopQueryParams = {
      q: searchParams.get("q") || undefined,
      category: newCategories.length > 0 ? newCategories.join(",") : undefined,
      collection: searchParams.get("collection") || undefined,
      sort: searchParams.get("sort") || undefined,
      page: undefined, // Reset to page 1
    }

    router.push(buildShopUrl(params))
  }

  const updateCollection = (collectionId: string, checked: boolean) => {
    let newCollections = selectedCollections.filter((c) => c !== collectionId)
    if (checked) {
      newCollections.push(collectionId)
    }

    const params: ShopQueryParams = {
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      collection: newCollections.length > 0 ? newCollections.join(",") : undefined,
      sort: searchParams.get("sort") || undefined,
      page: undefined, // Reset to page 1
    }

    router.push(buildShopUrl(params))
  }

  const hasActiveFilters =
    selectedCategories.length > 0 || selectedCollections.length > 0

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
        defaultValue={["categories", "collections"]}
        className="w-full"
      >
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
      </Accordion>
    </div>
  )
}
