"use client"

import { useQueryState } from "nuqs"
import { useEffect, useState, useTransition, useRef } from "react"
import { searchProducts } from "@/features/search/actions/search"

interface UseSearchOptions {
  defaultValue?: string
  initialHits?: any[]
}

export function useSearch({ defaultValue = "", initialHits = [] }: UseSearchOptions = {}) {
  const [query, setQuery] = useQueryState("q", {
    defaultValue,
    shallow: false // We want to update server-side props/URL (triggers server refresh)
  })

  const [hits, setHits] = useState(initialHits)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    // Skip search on initial mount - server already rendered with correct data
    // Only search client-side when query actually changes
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // If query is null (cleared), treat as empty string
    const term = query || ""

    startTransition(async () => {
      try {
        setError(null)
        const result = await searchProducts(term)
        setHits(result.hits)
      } catch (err) {
        console.error("Search error:", err)
        setError("Failed to fetch search results")
        setHits([])
      }
    })
  }, [query])

  return {
    query,
    setQuery,
    hits,
    isPending,
    error
  }
}
