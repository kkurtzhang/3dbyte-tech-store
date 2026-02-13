"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export interface DealsFilterOption {
  id: string
  label: string
  min?: number
  max?: number
  count?: number
}

export interface DealsFilterProps {
  activeMinDiscount?: number
  activeMaxDiscount?: number
  filters: DealsFilterOption[]
  className?: string
}

export function DealsFilter({
  activeMinDiscount,
  activeMaxDiscount,
  filters,
  className,
}: DealsFilterProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const hasActiveFilters = activeMinDiscount !== undefined || activeMaxDiscount !== undefined

  const handleFilterClick = (min?: number, max?: number) => {
    const params = new URLSearchParams()
    
    if (min !== undefined) {
      params.set("minDiscount", min.toString())
    }
    if (max !== undefined) {
      params.set("maxDiscount", max.toString())
    }

    router.push(`/deals${params.toString() ? `?${params.toString()}` : ""}`)
  }

  const isActive = (min?: number, max?: number) => {
    if (min === undefined && max === undefined) return !hasActiveFilters
    return activeMinDiscount === min && activeMaxDiscount === max
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Discount</h3>
        {hasActiveFilters && (
          <Link
            href="/deals"
            className="text-xs font-mono text-primary hover:underline"
          >
            Clear
          </Link>
        )}
      </div>

      {/* Filter Options */}
      <div className="space-y-2">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => handleFilterClick(filter.min, filter.max)}
            className={cn(
              "flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-all",
              isActive(filter.min, filter.max)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/50 hover:bg-accent"
            )}
          >
            <span className="flex items-center gap-2">
              {filter.min !== undefined && filter.min >= 40 && (
                <Badge variant="destructive" className="text-[10px] py-0 h-5">
                  HOT
                </Badge>
              )}
              <span>{filter.label}</span>
            </span>
            {filter.count !== undefined && (
              <span className="font-mono text-xs text-muted-foreground">
                ({filter.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Info Box */}
      <div className="rounded-lg border bg-card p-4">
        <h4 className="text-sm font-medium">How discounts are calculated</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Discounts are shown as the percentage off the original price. 
          Final prices reflect any active promotional codes at checkout.
        </p>
      </div>
    </div>
  )
}
