"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ContentSearchHit, ContentSearchScope } from "@/lib/search/content"

interface ContentSearchBoxProps {
  scope: ContentSearchScope
  placeholder: string
  className?: string
}

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 250

export function ContentSearchBox({ scope, placeholder, className }: ContentSearchBoxProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ContentSearchHit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          scope,
        })
        const response = await fetch(`/api/content-search?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          setResults([])
          setIsOpen(true)
          return
        }
        const payload = await response.json()
        setResults(Array.isArray(payload.results) ? payload.results : [])
        setIsOpen(true)
      } catch {
        if (!controller.signal.aborted) {
          setResults([])
          setIsOpen(true)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [query, scope])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const emptyText = useMemo(() => {
    return scope === "guides"
      ? "No guides matched your search."
      : "No help results matched your search."
  }, [scope])

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (results.length > 0 || query.trim().length >= MIN_QUERY_LENGTH) {
            setIsOpen(true)
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border bg-background pl-10 pr-10 py-6 text-base focus-visible:ring-primary/20"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("")
            setResults([])
            setIsOpen(false)
          }}
          className="absolute right-3 top-3 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-40 mt-2 rounded-lg border bg-background shadow-md">
          {isLoading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Searching...</p>
          ) : results.length > 0 ? (
            <ul className="max-h-80 overflow-auto py-1">
              {results.map((result) => (
                <li key={result.id}>
                  <Link
                    href={result.url}
                    className="block px-4 py-3 hover:bg-accent/60 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs uppercase tracking-wider text-primary/80">
                        {result.kind}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mt-1">{result.title}</p>
                    {result.snippet ? (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.snippet}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">{emptyText}</p>
          )}
        </div>
      )}
    </div>
  )
}
