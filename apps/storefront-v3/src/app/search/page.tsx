import { SearchInput } from "@/features/search/components/search-input";
import { SearchResults } from "@/features/search/components/search-results";
import { SearchFilters } from "@/features/search/components/search-filters";
import { searchProducts } from "@/features/search/actions/search";
import { Suspense } from "react";
import { ListingLayout } from "@/components/layout/listing-layout";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string | string[];
    material?: string | string[];
    diameter?: string | string[];
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";

  // Parse filters from searchParams for initial fetch
  const { hits } = await searchProducts(query, {
    categories:
      typeof params.category === "string" ? [params.category] : params.category,
    materials:
      typeof params.material === "string" ? [params.material] : params.material,
    diameters:
      typeof params.diameter === "string" ? [params.diameter] : params.diameter,
  });

  return (
    <ListingLayout
      header={
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              CATALOG_SEARCH
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              [ INDEX: PRODUCTS ]
            </p>
          </div>
          <div className="flex w-full items-center gap-2 md:w-auto">
            <div className="flex-1 md:flex-none">
              <SearchInput />
            </div>
          </div>
        </div>
      }
      sidebar={
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-mono text-sm font-bold">FILTERS</h3>
          </div>
          <Suspense fallback={<div className="space-y-4"><div className="h-20 animate-pulse bg-muted/20" /><div className="h-20 animate-pulse bg-muted/20" /><div className="h-20 animate-pulse bg-muted/20" /></div>}>
            <SearchFilters />
          </Suspense>
        </div>
      }
    >
      <div className="flex-1">
        <div role="status" aria-live="polite" className="sr-only">
          {query ? `Showing results for "${query}"` : "Browse all products"}
        </div>
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
          <SearchResults initialHits={hits} initialQuery={query} />
        </Suspense>
      </div>
    </ListingLayout>
  );
}
