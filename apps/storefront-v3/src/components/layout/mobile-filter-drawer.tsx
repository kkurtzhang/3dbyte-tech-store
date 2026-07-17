"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import type { ReactNode } from "react"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface MobileFilterDrawerProps {
  children: ReactNode
  resetUrl: string
}

function getActiveFilterCount(searchParams: URLSearchParams): number {
  let count = 0

  for (const key of ["category", "brand", "collection"]) {
    count += searchParams.get(key)?.split(",").filter(Boolean).length ?? 0
  }

  for (const key of ["bundle", "onSale"]) {
    if (searchParams.get(key) === "true") count += 1
  }

  if (searchParams.get("inStock") === "false") count += 1
  if (searchParams.has("minPrice") || searchParams.has("maxPrice")) count += 1

  searchParams.forEach((value, key) => {
    if (key.startsWith("options_")) {
      count += value.split(",").filter(Boolean).length
    }
  })

  return count
}

export function MobileFilterDrawer({
  children,
  resetUrl,
}: MobileFilterDrawerProps) {
  const searchParams = useSearchParams()
  const activeFilterCount = getActiveFilterCount(searchParams)
  const triggerLabel =
    activeFilterCount > 0
      ? `Filters, ${activeFilterCount} active`
      : "Filters"

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between lg:hidden"
          aria-label={triggerLabel}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex max-h-[90dvh] flex-col rounded-t-xl px-0 pb-0 lg:hidden"
      >
        <SheetHeader className="px-6 text-left">
          <SheetTitle>Filter products</SheetTitle>
          <SheetDescription>
            Refine the catalogue, then apply your selections.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
        <SheetFooter className="border-t bg-background p-4">
          <SheetClose asChild>
            <Button asChild variant="outline">
              <Link href={resetUrl}>Reset filters</Link>
            </Button>
          </SheetClose>
          <SheetClose asChild>
            <Button type="button">Apply filters</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
