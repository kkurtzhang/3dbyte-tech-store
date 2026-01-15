import { SearchInput } from "@/features/search/components/search-input"
import { SearchResults } from "@/features/search/components/search-results"
import { SearchFilters } from "@/features/search/components/search-filters"
import { searchProducts } from "@/features/search/actions/search"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Filter } from "lucide-react"

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    category?: string | string[]
    material?: string | string[]
    diameter?: string | string[]
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q || ""

  // Parse filters from searchParams for initial fetch
  // Note: nuqs handles array/string parsing on client, but here we need to handle it manually if needed for SSR
  // For the MVP, we pass these to the initial search if we want SSR results to match filters immediately

  // Initial server-side fetch for SEO and fast first paint
  // We're passing the raw query. If we want SSR to respect filters, we need to pass them to searchProducts
  const { hits } = await searchProducts(query, {
    categories: typeof params.category === 'string' ? [params.category] : params.category,
    materials: typeof params.material === 'string' ? [params.material] : params.material,
    diameters: typeof params.diameter === 'string' ? [params.diameter] : params.diameter,
  })

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">CATALOG_SEARCH</h1>
          <p className="text-muted-foreground font-mono text-sm">[ INDEX: PRODUCTS ]</p>
        </div>
        <div className="flex w-full items-center gap-2 md:w-auto">
          <div className="flex-1 md:flex-none">
            <SearchInput />
          </div>

          {/* Mobile Filter Trigger */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">Filters</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="mb-6 text-left">
                  <SheetTitle className="font-mono font-bold">FILTERS</SheetTitle>
                </SheetHeader>
                <SearchFilters />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar Filters (Desktop) */}
        <aside className="hidden w-64 flex-none lg:block">
          <div className="sticky top-20 rounded-sm border p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-mono text-sm font-bold">FILTERS</h3>
            </div>
            <SearchFilters />
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
