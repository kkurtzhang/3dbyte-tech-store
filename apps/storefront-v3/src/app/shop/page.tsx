import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { searchProducts } from "@/lib/search/products";

// Force dynamic rendering to prevent caching
export const dynamic = "force-dynamic";
import { ProductGrid } from "@/features/shop/components/product-grid";
import {
  ShopSort,
  type SortOption,
} from "@/features/shop/components/shop-sort";
import { ListingLayout } from "@/components/layout/listing-layout";
import { ShopErrorState } from "@/features/shop/components/shop-error-state";
import { ShopEmptyState } from "@/features/shop/components/shop-empty-state";
import {
  copyDynamicOptionParams,
  hasDynamicOptionParams,
  parseDynamicOptionParams,
} from "@/lib/utils/search-params";
import { buildShopUrl, type ShopQueryParams } from "@/lib/utils/url";
import { ShopFilters } from "@/components/filters";

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
    hasDynamicOptionParams(params)
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

  copyDynamicOptionParams(params, queryParams as Record<string, string | undefined>);

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
  const options = parseDynamicOptionParams(params);

  // Fetch products from Meilisearch
  const result = await searchProducts({
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
        sidebar={<ShopFilters />}
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
      sidebar={<ShopFilters />}
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
