import { SearchInput } from "@/features/search/components/search-input"
import { SearchResults } from "@/features/search/components/search-results"
import { searchProducts } from "@/features/search/actions/search"
import { Suspense } from "react"

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const query = q || ""

  // Initial server-side fetch for SEO and fast first paint
  const { hits } = await searchProducts(query)

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">CATALOG_SEARCH</h1>
          <p className="text-muted-foreground font-mono text-sm">[ INDEX: PRODUCTS ]</p>
        </div>
        <div className="w-full md:w-auto">
          <SearchInput />
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar Filters (Desktop) - Placeholder for now */}
        <aside className="hidden w-64 flex-none lg:block">
          <div className="sticky top-20 rounded-sm border p-4">
            <h3 className="mb-4 font-mono text-sm font-bold">FILTERS</h3>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>Category</p>
              <p>Material</p>
              <p>Diameter</p>
            </div>
          </div>
        </aside>

        {/* Results Grid */}
        <div className="flex-1">
          <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
            <SearchResults initialHits={hits} initialQuery={query} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
