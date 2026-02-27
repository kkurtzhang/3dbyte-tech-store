"use client"

import { ProductCard } from "@/features/product/components/product-card"
import { useSearch } from "@/lib/hooks/use-search"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

interface SearchResultsProps {
  initialHits: any[]
  initialQuery?: string
}

export function SearchResults({ initialHits, initialQuery = "" }: SearchResultsProps) {
  const { hits, isPending } = useSearch({
    defaultValue: initialQuery,
    initialHits
  })

  const [focusedIndex, setFocusedIndex] = useState(-1)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Responsive grid columns based on viewport
  const getGridColumns = () => {
    if (typeof window === "undefined") return 4
    const width = window.innerWidth
    if (width >= 1024) return 4
    if (width >= 768) return 3
    return 2
  }

  const [columns, setColumns] = useState(4)

  useEffect(() => {
    const updateColumns = () => setColumns(getGridColumns())
    updateColumns()
    window.addEventListener("resize", updateColumns)
    return () => window.removeEventListener("resize", updateColumns)
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (hits.length === 0) return

    const gridCols = getGridColumns()
    const totalItems = hits.length
    let newIndex = focusedIndex

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault()
        newIndex = focusedIndex < totalItems - 1 ? focusedIndex + 1 : 0
        break
      case "ArrowLeft":
        e.preventDefault()
        newIndex = focusedIndex > 0 ? focusedIndex - 1 : totalItems - 1
        break
      case "ArrowDown":
        e.preventDefault()
        newIndex = focusedIndex + gridCols < totalItems ? focusedIndex + gridCols : totalItems - 1
        break
      case "ArrowUp":
        e.preventDefault()
        newIndex = focusedIndex - gridCols >= 0 ? focusedIndex - gridCols : 0
        break
      case "Enter":
        e.preventDefault()
        if (focusedIndex >= 0 && hits[focusedIndex]) {
          router.push(`/products/${hits[focusedIndex].handle}`)
        }
        break
      case "Escape":
        e.preventDefault()
        containerRef.current?.focus()
        setFocusedIndex(-1)
        break
      case "Home":
        e.preventDefault()
        newIndex = 0
        break
      case "End":
        e.preventDefault()
        newIndex = totalItems - 1
        break
      default:
        return
    }

    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex)
      cardRefs.current[newIndex]?.focus()
    }
  }, [hits.length, focusedIndex, router])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener("keydown", handleKeyDown)
      return () => container.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])

  useEffect(() => {
    setFocusedIndex(-1)
  }, [hits])

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
      <div 
        role="status" 
        aria-live="polite"
        className="flex h-64 flex-col items-center justify-center gap-2 border border-dashed rounded-sm bg-secondary/10 text-muted-foreground font-mono"
      >
        <p>NO_RESULTS_FOUND</p>
        <p className="text-xs">TRY_ADJUSTING_SEARCH_TERMS</p>
        <p className="text-[10px] text-muted-foreground/60">USE_ARROW_KEYS_TO_NAVIGATE</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Search Results"
      aria-multiselectable="false"
      tabIndex={0}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 outline-none"
    >
      <div role="presentation" className="sr-only">
        {hits.length} products found. Use arrow keys to navigate.
      </div>
      {hits.map((hit: any, index: number) => (
        <div
          key={hit.id}
          ref={(el) => { cardRefs.current[index] = el }}
          role="option"
          aria-selected={focusedIndex === index}
          tabIndex={focusedIndex === index ? 0 : -1}
          onClick={() => router.push(`/products/${hit.handle}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              router.push(`/products/${hit.handle}`)
            }
          }}
          className={`cursor-pointer transition-all duration-150 ${
            focusedIndex === index
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]"
              : "hover:scale-[1.01]"
          }`}
          onFocus={() => setFocusedIndex(index)}
        >
          <ProductCard
            id={hit.id}
            handle={hit.handle}
            title={hit.title}
            thumbnail={hit.thumbnail}
            price={hit.price || { amount: 0, currency_code: "USD" }}
            originalPrice={hit.originalPrice}
            discountPercentage={hit.discountPercentage}
            specs={hit.specs}
          />
        </div>
      ))}
    </div>
  )
}
