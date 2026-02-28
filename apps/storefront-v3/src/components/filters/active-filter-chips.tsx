"use client"

import { FilterFacets, formatOptionLabel } from "@/features/shop/types/filters"

export interface ActiveFilterChipsProps {
  facets: FilterFacets
  selectedCategories: string[]
  selectedBrands: string[]
  selectedCollections: string[]
  selectedOnSale: boolean
  selectedInStock: boolean
  priceRange: { min: number; max: number }
  selectedOptions: Record<string, string[]>
  onRemoveFilter: (type: string, value?: string) => void
}

export function ActiveFilterChips({
  facets,
  selectedCategories,
  selectedBrands,
  selectedCollections,
  selectedOnSale,
  selectedInStock,
  priceRange,
  selectedOptions,
  onRemoveFilter,
}: ActiveFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {selectedCategories.map((id) => {
        const cat = facets.categories.find((c) => c.value === id)
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs"
          >
            Category: {cat?.label || id}
            <button
              onClick={() => onRemoveFilter("category", id)}
              className="hover:text-primary ml-1"
              aria-label={`Remove ${cat?.label || id} category`}
            >
              ×
            </button>
          </span>
        )
      })}
      {selectedBrands.map((id) => {
        const brand = facets.brands.find((b) => b.value === id)
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs"
          >
            Brand: {brand?.label || id}
            <button
              onClick={() => onRemoveFilter("brand", id)}
              className="hover:text-primary ml-1"
              aria-label={`Remove ${brand?.label || id} brand`}
            >
              ×
            </button>
          </span>
        )
      })}
      {selectedCollections.map((id) => {
        const collection = facets.collections.find((c) => c.value === id)
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs"
          >
            Collection: {collection?.label || id}
            <button
              onClick={() => onRemoveFilter("collection", id)}
              className="hover:text-primary ml-1"
              aria-label={`Remove ${collection?.label || id} collection`}
            >
              ×
            </button>
          </span>
        )
      })}
      {selectedOnSale && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
          On Sale
          <button
            onClick={() => onRemoveFilter("onSale")}
            className="hover:text-primary ml-1"
            aria-label="Remove on sale filter"
          >
            ×
          </button>
        </span>
      )}
      {selectedInStock && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
          In Stock
          <button
            onClick={() => onRemoveFilter("inStock")}
            className="hover:text-primary ml-1"
            aria-label="Remove in stock filter"
          >
            ×
          </button>
        </span>
      )}
      {(priceRange.min !== facets.priceRange.min ||
        priceRange.max !== facets.priceRange.max) && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
          Price: ${priceRange.min} - ${priceRange.max}
          <button
            onClick={() => onRemoveFilter("price")}
            className="hover:text-primary ml-1"
            aria-label="Remove price range filter"
          >
            ×
          </button>
        </span>
      )}
      {Object.entries(selectedOptions).map(([optionKey, values]) =>
        values.map((value) => (
          <span
            key={`${optionKey}-${value}`}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs"
          >
            {formatOptionLabel(optionKey)}: {value}
            <button
              onClick={() => onRemoveFilter(optionKey, value)}
              className="hover:text-primary ml-1"
              aria-label={`Remove ${value} ${formatOptionLabel(optionKey)}`}
            >
              ×
            </button>
          </span>
        ))
      )}
    </div>
  )
}
