"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { buildShopUrl, type ShopQueryParams } from "@/lib/utils/url"

// Sort options supported by Meilisearch (title not sortable in current index)
export type SortOption =
  | "newest"
  | "price-asc"
  | "price-desc"

export interface ShopSortProps {
  className?: string
  basePath?: string // Optional base path for non-shop pages (e.g., '/brands/esun')
}

const SORT_OPTIONS: Record<
  SortOption,
  { label: string; value: SortOption }
> = {
  newest: { label: "Newest", value: "newest" },
  "price-asc": { label: "Price: Low to High", value: "price-asc" },
  "price-desc": { label: "Price: High to Low", value: "price-desc" },
}

export function ShopSort({ className, basePath = "/shop" }: ShopSortProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSort = (searchParams.get("sort") as SortOption) || "newest"

  const updateSort = (value: SortOption) => {
    const params: ShopQueryParams = {
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      collection: searchParams.get("collection") || undefined,
      brand: searchParams.get("brand") || undefined,
      onSale: searchParams.get("onSale") || undefined,
      inStock: searchParams.get("inStock") || undefined,
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      sort: value === "newest" ? undefined : value,
      page: undefined, // Reset to page 1
    }

    // Add dynamic options
    searchParams.forEach((val, key) => {
      if (key.startsWith("options_")) {
        (params as Record<string, string | undefined>)[key] = val || undefined
      }
    })

    router.push(buildShopUrl(params, basePath))
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label
        htmlFor="sort-select"
        className="text-sm font-medium text-muted-foreground"
      >
        Sort by:
      </label>
      <Select value={currentSort} onValueChange={updateSort}>
        <SelectTrigger
          id="sort-select"
          className="w-[200px] font-sans text-sm focus:ring-primary"
        >
          <SelectValue placeholder="Select sort" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(SORT_OPTIONS).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Get sort order string for Meilisearch
 * Meilisearch uses :asc and :desc suffixes for sorting
 * Note: Index uses created_at_timestamp (Unix timestamp) for sorting by date
 */
export function getSortOrder(sort: SortOption): string {
  switch (sort) {
    case "newest":
      return "created_at_timestamp:desc"
    case "price-asc":
      return "price_aud:asc"
    case "price-desc":
      return "price_aud:desc"
    default:
      return "created_at_timestamp:desc"
  }
}
