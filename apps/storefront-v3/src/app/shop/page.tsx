import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { searchProducts, getFacets, type FacetDistribution } from "@/lib/search/products";

// Force dynamic rendering to prevent caching
export const dynamic = "force-dynamic";
import type { FilterFacets, FilterOption } from "@/features/shop/types/filters";
import { ProductGrid } from "@/features/shop/components/product-grid";
import { AdvancedShopFilters } from "@/features/shop/components/advanced-shop-filters";
import {
  ShopSort,
  type SortOption,
} from "@/features/shop/components/shop-sort";
import { ListingLayout } from "@/components/layout/listing-layout";
import { ShopErrorState } from "@/features/shop/components/shop-error-state";
import { ShopEmptyState } from "@/features/shop/components/shop-empty-state";
import { buildShopUrl, type ShopQueryParams } from "@/lib/utils/url";
import { getCategories } from "@/lib/medusa/categories";
import { getCollections } from "@/lib/medusa/collections";
import { searchBrands } from "@/lib/search/brands";

interface ShopPageProps {
  searchParams: Promise<{
    page?: string;
    sort?: SortOption;
    category?: string;
    collection?: string;
    q?: string;
    minPrice?: string;
    maxPrice?: string;
    brand?: string;
    onSale?: string;
    inStock?: string;
    // Dynamic options (e.g., options_colour, options_size)
    [key: `options_${string}`]: string | undefined;
  }>;
}

/**
 * Parse dynamic options from URL params (e.g., options_colour=Black,White)
 */
function parseDynamicOptions(
  params: Record<string, string | undefined>
): Record<string, string[]> {
  const options: Record<string, string[]> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (key.startsWith("options_") && value) {
      const optionKey = key.replace("options_", "");
      options[optionKey] = value.split(",").filter(Boolean);
    }
  });

  return options;
}

/**
 * Transform raw Meilisearch facet distribution to FilterFacets format
 * with human-readable labels for categories, brands, and collections
 */
function transformFacets(
  facetDistribution: FacetDistribution,
  categoryMap: Map<string, string>,
  brandMap: Map<string, string>,
  collectionMap: Map<string, string>
): FilterFacets {
  // Transform categories (category_ids facet contains category IDs)
  // Map IDs to readable names
  const categories: FilterOption[] = Object.entries(
    facetDistribution["category_ids"] || {}
  )
    .map(([id, count]) => ({
      value: id,
      label: categoryMap.get(id) || id,
      count,
    }))
    .sort((a, b) => (a.label || a.value).localeCompare(b.label || b.value));

  // Transform brands (brand.id facet contains brand IDs)
  // Map IDs to readable names
  const brands: FilterOption[] = Object.entries(
    facetDistribution["brand.id"] || {}
  )
    .map(([id, count]) => ({
      value: id,
      label: brandMap.get(id) || id,
      count,
    }))
    .sort((a, b) => (a.label || a.value).localeCompare(b.label || b.value));

  // Transform collections (collection_ids facet contains collection IDs)
  // Map IDs to readable names
  const collections: FilterOption[] = Object.entries(
    facetDistribution["collection_ids"] || {}
  )
    .map(([id, count]) => ({
      value: id,
      label: collectionMap.get(id) || id,
      count,
    }))
    .sort((a, b) => (a.label || a.value).localeCompare(b.label || b.value));

  // Transform on_sale facet
  const onSale: FilterOption[] = Object.entries(
    facetDistribution["on_sale"] || {}
  ).map(([value, count]) => ({
    value,
    count,
  }));

  // Transform in_stock facet
  const inStock: FilterOption[] = Object.entries(
    facetDistribution["in_stock"] || {}
  ).map(([value, count]) => ({
    value,
    count,
  }));

  // Calculate price range from price_aud facet
  const priceKeys = Object.keys(facetDistribution["price_aud"] || {}).map(
    Number
  );
  const priceRange = {
    min: priceKeys.length > 0 ? Math.min(...priceKeys) : 0,
    max: priceKeys.length > 0 ? Math.max(...priceKeys) : 1000,
  };

  // Transform dynamic options (options_* facets)
  // Filter out options with 0 count to hide empty filter sections
  const options: Record<string, FilterOption[]> = {};
  Object.entries(facetDistribution).forEach(([key, distribution]) => {
    if (key.startsWith("options_") && distribution) {
      const filteredOpts = Object.entries(distribution)
        .filter(([_, count]) => count > 0)
        .map(([value, count]) => ({
          value,
          count,
        }));
      if (filteredOpts.length > 0) {
        options[key] = filteredOpts;
      }
    }
  });

  return {
    categories,
    brands,
    collections,
    onSale,
    inStock,
    priceRange,
    options,
  };
}

/**
 * Check if any filters are active
 */
function hasActiveFilters(params: ShopPageProps["searchParams"] extends Promise<infer T> ? T : never): boolean {
  return (
    !!params.category ||
    !!params.brand ||
    !!params.collection ||
    params.onSale === "true" ||
    params.inStock === "true" ||
    !!params.minPrice ||
    !!params.maxPrice ||
    !!params.q ||
    Object.keys(params).some((key) => key.startsWith("options_"))
  );
}

/**
 * Build pagination URL preserving all current filter params
 */
function buildPaginationUrl(
  pageNum: number,
  params: Awaited<ShopPageProps["searchParams"]>,
  sort: string
): string {
  const queryParams: ShopQueryParams = {
    q: params.q,
    category: params.category,
    brand: params.brand,
    onSale: params.onSale,
    inStock: params.inStock,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    sort: sort !== "newest" ? sort : undefined,
    page: pageNum > 1 ? pageNum : undefined,
  };

  // Add dynamic options
  Object.entries(params).forEach(([key, value]) => {
    if (key.startsWith("options_") && value) {
      (queryParams as Record<string, string | undefined>)[key] = value;
    }
  });

  return buildShopUrl(queryParams);
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;

  // Redirect to add inStock=true by default if not explicitly set
  // This ensures the In Stock filter is checked by default
  if (params.inStock === undefined) {
    const redirectParams: ShopQueryParams = {
      ...params,
      inStock: "true",
    };
    redirect(buildShopUrl(redirectParams));
  }

  const page = Number(params.page) || 1;
  const limit = 20;
  const sort = params.sort || "newest";

  // Parse category filters
  const categoryIds = params.category?.split(",").filter(Boolean) || [];

  // Parse brand filters
  const brandIds = params.brand?.split(",").filter(Boolean) || [];

  // Parse collection filters
  const collectionIds = params.collection?.split(",").filter(Boolean) || [];

  // Parse price range
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;

  // Parse dynamic options from URL
  const options = parseDynamicOptions(params);

  // Check if any filters are active
  const hasFilters =
    categoryIds.length > 0 ||
    brandIds.length > 0 ||
    collectionIds.length > 0 ||
    params.onSale === "true" ||
    params.inStock === "true" ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    Object.keys(options).length > 0;

  // Fetch products, categories, collections, and brands in parallel
  // When filters are active, fetch unfiltered facets separately for filter UI
  const [result, categoriesData, collectionsData, brandsData, unfilteredFacets] = await Promise.all([
    searchProducts({
      query: params.q,
      page,
      limit,
      sort,
      filters: {
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
        brandIds: brandIds.length > 0 ? brandIds : undefined,
        collectionIds: collectionIds.length > 0 ? collectionIds : undefined,
        onSale: params.onSale === "true" ? true : undefined,
        inStock: params.inStock === "true" ? true : undefined,
        minPrice,
        maxPrice,
        options: Object.keys(options).length > 0 ? options : undefined,
      },
    }),
    getCategories(),
    getCollections(),
    searchBrands({ limit: 100 }),
    // Only fetch unfiltered facets when filters are active (for showing available options)
    hasFilters ? getFacets() : Promise.resolve(null),
  ]);

  // Build ID-to-name maps for categories, collections, and brands
  const categoryMap = new Map<string, string>();
  categoriesData.forEach((cat) => {
    categoryMap.set(cat.id, cat.name || cat.handle || cat.id);
  });

  const collectionMap = new Map<string, string>();
  collectionsData.forEach((col) => {
    collectionMap.set(col.id, col.title || col.handle || col.id);
  });

  const brandMap = new Map<string, string>();
  brandsData.hits.forEach((brand) => {
    brandMap.set(brand.id, brand.name || brand.handle || brand.id);
  });

  // Handle error state
  if (result.error) {
    return (
      <ListingLayout
        header={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">All Products</h1>
              <p className="font-mono text-sm text-muted-foreground">
                Unable to load products
              </p>
            </div>
          </div>
        }
        sidebar={null}
      >
        <ShopErrorState />
      </ListingLayout>
    );
  }

  // Transform facets for filter UI with human-readable labels
  // Dynamic filtering: Use filtered facets for categories, brands, collections, options
  // Price range: Use unfiltered facets to show full range (better UX for expanding search)
  const facets = transformFacets(
    result.facets,
    categoryMap,
    brandMap,
    collectionMap
  );

  // Override price range with unfiltered facets if available (when filters are active)
  // This allows users to see the full price range and expand their search
  if (unfilteredFacets?.facets?.price_aud) {
    const priceKeys = Object.keys(unfilteredFacets.facets.price_aud).map(Number);
    if (priceKeys.length > 0) {
      facets.priceRange = {
        min: Math.min(...priceKeys),
        max: Math.max(...priceKeys),
      };
    }
  }

  // Calculate pagination
  const totalPages = Math.ceil(result.totalCount / limit);

  // Check if any filters are active (for empty state)
  const filtersActive = hasActiveFilters(params);

  // Handle empty state
  if (result.products.length === 0) {
    return (
      <ListingLayout
        header={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">All Products</h1>
              <p className="font-mono text-sm text-muted-foreground">
                0 products
              </p>
            </div>
            <ShopSort />
          </div>
        }
        sidebar={
          <AdvancedShopFilters facets={facets} />
        }
      >
        <ShopEmptyState hasActiveFilters={filtersActive} />
      </ListingLayout>
    );
  }

  // Transform products for ProductGrid compatibility
  // Note: Meilisearch returns prices in dollars, ProductGrid uses them directly
  const productsForGrid = result.products.map((product) => ({
    id: product.id,
    handle: product.handle,
    title: product.title,
    thumbnail: product.thumbnail,
    variants: product.variants,
    price: product.price_aud,
    currency_code: "AUD",
    originalPrice: product.original_price_aud ?? undefined,
    salePrice: product.on_sale ? product.price_aud : undefined,
    discountPercentage:
      product.on_sale && product.original_price_aud
        ? ((product.original_price_aud - product.price_aud) /
            product.original_price_aud) *
          100
        : undefined,
  }));

  return (
    <ListingLayout
      header={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">All Products</h1>
            <p className="font-mono text-sm text-muted-foreground">
              {result.totalCount}{" "}
              {result.totalCount === 1 ? "product" : "products"}
              {result.degradedMode && (
                <span className="ml-2 text-amber-500">(limited results)</span>
              )}
            </p>
          </div>
          <ShopSort />
        </div>
      }
      sidebar={<AdvancedShopFilters facets={facets} />}
    >
      <div className="space-y-8">
        <ProductGrid products={productsForGrid} />

        {totalPages > 1 && (
          <div className="flex justify-center">
            <nav
              className="flex flex-wrap gap-2 justify-center"
              role="navigation"
              aria-label="Pagination"
            >
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                const isCurrent = pageNum === page;

                return (
                  <a
                    key={pageNum}
                    href={buildPaginationUrl(pageNum, params, sort)}
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-md border font-mono text-sm transition-colors",
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/50 hover:bg-accent"
                    )}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {pageNum}
                  </a>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </ListingLayout>
  );
}

export async function generateMetadata({
  searchParams,
}: ShopPageProps): Promise<Metadata> {
  const params = await searchParams;

  let title = "All Products | Shop";

  if (params.q) {
    title = `Search: ${params.q} | Shop`;
  } else if (params.category) {
    title = `${params.category} Products | Shop`;
  } else if (params.brand) {
    title = `Brand Products | Shop`;
  } else if (params.onSale === "true") {
    title = "On Sale Products | Shop";
  } else if (params.inStock === "true") {
    title = "In Stock Products | Shop";
  }

  return {
    title,
    description: "Browse our product catalog with advanced filtering options.",
  };
}
