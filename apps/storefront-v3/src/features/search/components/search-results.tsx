"use client"

import { ProductCard } from "@/features/product/components/product-card"
import { useSearch } from "@/lib/hooks/use-search"

interface SearchResultsProps {
  initialHits: any[]
  initialQuery?: string
}

export function SearchResults({ initialHits, initialQuery = "" }: SearchResultsProps) {
  const { hits, isPending } = useSearch({
    defaultValue: initialQuery,
    initialHits
  })

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-sm bg-muted/50" />
        ))}
      </div>
    )
  }

  if (hits.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 border border-dashed rounded-sm bg-secondary/10 text-muted-foreground font-mono">
        <p>NO_RESULTS_FOUND</p>
        <p className="text-xs">TRY_ADJUSTING_FILTERS</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {hits.map((hit: any) => (
        <ProductCard
          key={hit.id}
          id={hit.id}
          handle={hit.handle}
          title={hit.title}
          thumbnail={hit.thumbnail}
          price={hit.price || { amount: 0, currency_code: "USD" }}
          specs={hit.specs}
        />
      ))}
    </div>
  )
}
