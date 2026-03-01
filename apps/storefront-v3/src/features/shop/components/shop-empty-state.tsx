"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PackageX } from "lucide-react"

interface ShopEmptyStateProps {
  hasActiveFilters: boolean
}

export function ShopEmptyState({ hasActiveFilters }: ShopEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <PackageX className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">
        {hasActiveFilters ? "No products match your filters" : "No products available"}
      </h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        {hasActiveFilters
          ? "Try adjusting your filter criteria or browse all products."
          : "Check back soon for new arrivals!"}
      </p>
      {hasActiveFilters && (
        <Button variant="outline" asChild>
          <Link href="/shop">
            Clear All Filters
          </Link>
        </Button>
      )}
    </div>
  )
}
