"use client"

import { useQueryState } from "nuqs"
import { Search, Command, Package, X, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { sdk } from "@/lib/medusa/client"
import type { StoreProduct } from "@medusajs/types"

export function SearchInput() {
  const router = useRouter()
  const [query, setQuery] = useQueryState("q", {
    shallow: false,
    throttleMs: 500,
    defaultValue: "",
  })

  const [value, setValue] = useState(query)
  const [showDropdown, setShowDropdown] = useState(false)
  const [suggestions, setSuggestions] = useState<StoreProduct[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync internal state with URL query
  useEffect(() => {
    setValue(query)
  }, [query])

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        document.getElementById("search-input")?.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keyboard navigation within dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showDropdown || suggestions.length === 0) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault()
        handleSuggestionClick(suggestions[selectedIndex])
      } else if (e.key === "Escape") {
        setShowDropdown(false)
        setSelectedIndex(-1)
      }
    }

    const input = document.getElementById("search-input")
    input?.addEventListener("keydown", handleKeyDown)
    return () => input?.removeEventListener("keydown", handleKeyDown)
  }, [showDropdown, suggestions, selectedIndex])

  // Debounced search for autocomplete using Medusa SDK
  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSuggestions([])
      setShowDropdown(false)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const { products } = await sdk.store.product.list({
        q: searchTerm,
        limit: 6,
        fields: "id,handle,title,thumbnail,*variants,*variants.prices",
      })
      setSuggestions(products)
      setShowDropdown(true)
      setSelectedIndex(-1)
    } catch (error) {
      console.error("Autocomplete search failed:", error)
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearch = (term: string) => {
    setValue(term)
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(term)
    }, 300)

    // Update URL query (throttled by useQueryState)
    setQuery(term)
  }

  const handleSuggestionClick = (product: StoreProduct) => {
    setShowDropdown(false)
    setValue(product.title!)
    setQuery("")
    router.push(`/products/${product.handle}`)
  }

  const handleClear = () => {
    setValue("")
    setQuery("")
    setSuggestions([])
    setShowDropdown(false)
    document.getElementById("search-input")?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim() && !showDropdown) {
      // Trigger search when Enter is pressed and dropdown is not shown
      router.push(`/search?q=${encodeURIComponent(value)}`)
    }
  }

  return (
    <div className="relative w-full max-w-sm" ref={dropdownRef}>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        id="search-input"
        type="search"
        placeholder="SEARCH_CATALOG..."
        aria-label="Search products"
        aria-expanded={showDropdown}
        aria-controls="search-suggestions"
        autoComplete="off"
        className="w-full bg-background pl-9 pr-10 font-mono text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/20"
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => {
          if (value.trim() && suggestions.length > 0) {
            setShowDropdown(true)
          }
        }}
        onKeyDown={handleKeyDown}
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 top-2.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="absolute right-14 top-2.5 hidden items-center gap-1 text-[10px] text-muted-foreground/60 sm:flex">
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">⌘K</kbd>
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div
          id="search-suggestions"
          className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-background shadow-lg max-h-96 overflow-hidden"
          role="listbox"
        >
          {isSearching ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Products
              </div>
              {suggestions.map((product, index) => {
                  // Get price from first variant (already in dollars from Medusa v2)
                  const firstVariant = product.variants?.[0]
                  const price = firstVariant?.calculated_price?.calculated_amount
                    ? firstVariant.calculated_price.calculated_amount
                    : null

                  return (
                <button
                  key={product.id}
                  role="option"
                  aria-selected={selectedIndex === index}
                  onClick={() => handleSuggestionClick(product)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                    selectedIndex === index
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  }`}
                >
                  {product.thumbnail && (
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
                      <img
                        src={product.thumbnail}
                        alt={product.title || ""}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium truncate">{product.title}</span>
                  </div>
                  {price !== null && (
                    <div className="flex-shrink-0 text-sm font-semibold">
                      ${price.toFixed(2)}
                    </div>
                  )}
                </button>
                  )
                })}
              <button
                onClick={() => {
                  setShowDropdown(false)
                  router.push(`/search?q=${encodeURIComponent(value)}`)
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 text-sm text-primary hover:bg-accent/50 transition-colors border-t"
              >
                <span>View all results for "{value}"</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : value.trim() ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No products found
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
