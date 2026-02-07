"use client"

import { useQueryState } from "nuqs"
import { Search, Command } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"

export function SearchInput() {
  const [query, setQuery] = useQueryState("q", {
    shallow: false,
    throttleMs: 500,
    defaultValue: "",
  })

  const [value, setValue] = useState(query)

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

  const handleSearch = (term: string) => {
    setValue(term)
    setQuery(term)
  }

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        id="search-input"
        type="search"
        placeholder="SEARCH_CATALOG..."
        aria-label="Search products"
        className="w-full bg-background pl-9 pr-20 font-mono text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/20"
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
      />
      <div className="absolute right-2.5 top-2.5 hidden items-center gap-1 text-[10px] text-muted-foreground/60 sm:flex">
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">⌘K</kbd>
      </div>
    </div>
  )
}
