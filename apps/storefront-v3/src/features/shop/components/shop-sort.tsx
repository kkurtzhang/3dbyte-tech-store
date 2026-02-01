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

export type SortOption =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc"

export interface ShopSortProps {
  className?: string
}

const SORT_OPTIONS: Record<
  SortOption,
  { label: string; value: SortOption }
> = {
  newest: { label: "Newest", value: "newest" },
  "price-asc": { label: "Price: Low to High", value: "price-asc" },
  "price-desc": { label: "Price: High to Low", value: "price-desc" },
  "name-asc": { label: "Name: A to Z", value: "name-asc" },
  "name-desc": { label: "Name: Z to A", value: "name-desc" },
}

export function ShopSort({ className }: ShopSortProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSort = (searchParams.get("sort") as SortOption) || "newest"

  const updateSort = (value: SortOption) => {
    const params: ShopQueryParams = {
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      collection: searchParams.get("collection") || undefined,
      sort: value === "newest" ? undefined : value,
      page: undefined, // Reset to page 1
    }

    router.push(buildShopUrl(params))
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

export function getSortOrder(sort: SortOption): string {
  switch (sort) {
    case "newest":
      return "-created_at"
    case "price-asc":
      return "calculated_price.calculated_amount"
    case "price-desc":
      return "-calculated_price.calculated_amount"
    case "name-asc":
      return "title"
    case "name-desc":
      return "-title"
    default:
      return "-created_at"
  }
}
