"use client"

import { useQueryState } from "nuqs"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { useEffect, useState } from "react"

export function SearchInput() {
  const [query, setQuery] = useQueryState("q", {
    shallow: false, // Update server-side props on change
    throttleMs: 500,
    defaultValue: "",
  })

  const [value, setValue] = useState(query)

  // Sync internal state with URL query
  useEffect(() => {
    setValue(query)
  }, [query])

  const handleSearch = (term: string) => {
    setValue(term)
    setQuery(term)
  }

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="SEARCH_CATALOG..."
        className="w-full bg-background pl-9 font-mono text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/20"
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
      />
    </div>
  )
}
