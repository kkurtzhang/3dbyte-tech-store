import { SearchInput } from "@/features/search/components/search-input";
import { SearchResults } from "@/features/search/components/search-results";
import { searchProducts, type ProductSearchParams } from "@/lib/search/products";
import { Suspense } from "react";
import { ListingLayout } from "@/components/layout/listing-layout";
import { SearchFilters } from "@/components/filters";
import { ShopSort, type SortOption } from "@/features/shop/components/shop-sort";
import { parseDynamicOptionParams } from "@/lib/utils/search-params";
import { redirect } from "next/navigation";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    collection?: string;
    onSale?: string;
    inStock?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: SortOption;
    // Dynamic options (e.g., options_colour, options_size)
    [key: `options_${string}`]: string | undefined;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  // Redirect to set inStock=true by default if not explicitly set to "false"
  if (params.inStock === undefined) {
    const url = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.set(key, value);
    });
    url.set("inStock", "true");
    redirect(`/search?${url.toString()}`);
  }
  const query = params.q || "";
  const sort = params.sort || "newest";

  // Parse filters from searchParams for initial fetch
  const categoryIds = params.category?.split(",").filter(Boolean) || [];
  const brandIds = params.brand?.split(",").filter(Boolean) || [];
  const collectionIds = params.collection?.split(",").filter(Boolean) || [];

  // Parse dynamic options from URL
  const dynamicOptions = parseDynamicOptionParams(params);

  // Build search params using the working lib/search/products interface
  const searchRequest: ProductSearchParams = {
    query,
    sort,
    limit: 20,
    filters: {
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      brandIds: brandIds.length > 0 ? brandIds : undefined,
      collectionIds: collectionIds.length > 0 ? collectionIds : undefined,
      onSale: params.onSale === "true" ? true : undefined,
      inStock: params.inStock === "true" ? true : undefined,
      minPrice: params.minPrice ? Number(params.minPrice) : undefined,
      maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
      options: Object.keys(dynamicOptions).length > 0 ? dynamicOptions : undefined,
    }
  };

  const result = await searchProducts(searchRequest);

  const { products: rawProducts, totalCount, degradedMode } = result;

  // Transform ProductHit[] to format expected by ProductCard
  const products = rawProducts.map((p) => ({
    id: p.id,
    handle: p.handle,
    title: p.title,
    thumbnail: p.thumbnail || "",
    price: {
      amount: p.price_aud ?? 0,
      currency_code: "AUD",
    },
    originalPrice: p.original_price_aud,
    discountPercentage: p.on_sale && p.original_price_aud && p.price_aud
      ? Math.round((1 - p.price_aud / p.original_price_aud) * 100)
      : undefined,
  }));

  return (
    <ListingLayout
      header={
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {query ? `Search: "${query}"` : "All Products"}
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              {totalCount} {totalCount === 1 ? "product" : "products"} found
              {degradedMode && (
                <span className="ml-2 text-amber-500">(limited results)</span>
              )}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 md:w-auto">
            <div className="flex-1 md:flex-none">
              <SearchInput />
            </div>
            <ShopSort basePath="/search" />
          </div>
        </div>
      }
      sidebar={
        <Suspense fallback={<div className="space-y-4"><div className="h-20 animate-pulse bg-muted/20" /><div className="h-20 animate-pulse bg-muted/20" /><div className="h-20 animate-pulse bg-muted/20" /></div>}>
          <SearchFilters searchQuery={query} />
        </Suspense>
      }
    >
      <div className="flex-1">
        <div role="status" aria-live="polite" className="sr-only">
          {query ? `Showing results for "${query}"` : "Browse all products"}
        </div>
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
          <SearchResults initialHits={products} initialQuery={query} />
        </Suspense>
      </div>
    </ListingLayout>
  );
}
