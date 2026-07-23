"use client"

import { ProductCard } from "@/features/product/components/product-card"

interface SearchResultsProps {
  initialHits: any[]
  initialQuery?: string
}

export function SearchResults({ initialHits }: SearchResultsProps) {
  const hits = initialHits

  if (hits.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex h-64 flex-col items-center justify-center gap-2 border border-dashed rounded-sm bg-secondary/10 text-muted-foreground font-mono"
      >
        <p className="font-semibold text-foreground">No products found</p>
        <p className="text-xs">Try a broader term, brand, material, or product type.</p>
      </div>
    )
  }

  return (
    <ul
      role="list"
      aria-label="Search Results"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
    >
      <li className="sr-only">
        {hits.length} products found.
      </li>
      {hits.map((hit: any) => (
        <li
          key={hit.id}
          className="transition-transform duration-150 hover:scale-[1.01]"
        >
          <ProductCard
            id={hit.id}
            handle={hit.handle}
            title={hit.title}
            thumbnail={hit.thumbnail}
            price={hit.price || { amount: 0, currency_code: "USD" }}
            originalPrice={hit.originalPrice}
            discountPercentage={hit.discountPercentage}
            isBundle={hit.isBundle}
            isPreorder={hit.isPreorder}
            preorderAvailableDate={hit.preorderAvailableDate}
            bundleItemCount={hit.bundleItemCount}
            bundleItemTitles={hit.bundleItemTitles}
            availableInBundlesCount={hit.availableInBundlesCount}
            specs={hit.specs}
            sourceHref="/search"
            sourceLabel="Search"
            inventoryQuantity={hit.inventory_quantity}
            inStock={hit.in_stock}
          />
        </li>
      ))}
    </ul>
  )
}
