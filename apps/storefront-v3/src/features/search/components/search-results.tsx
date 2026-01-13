"use client"

import { ProductCard } from "@/features/product/components/product-card"
import { searchProducts } from "@/features/search/actions/search"
import { useQueryState } from "nuqs"
import { useEffect, useState, useTransition } from "react"

interface SearchResultsProps {
  initialHits: any[]
  initialQuery?: string
}

export function SearchResults({ initialHits, initialQuery = "" }: SearchResultsProps) {
  const [query] = useQueryState("q", { defaultValue: initialQuery })
  const [hits, setHits] = useState(initialHits)
  const [isPending, startTransition] = useTransition()

  // Re-fetch when query changes (client-side navigation)
  useEffect(() => {
    // If query is empty, we might want to show "Featured" or clear results.
    // For now, let's search empty string (browse all).
    const term = query || ""

    startTransition(async () => {
      const result = await searchProducts(term)
      setHits(result.hits)
    })
  }, [query])

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
