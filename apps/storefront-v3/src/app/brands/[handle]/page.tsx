import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { getBrandByHandle } from "@/lib/search/brands";
import { getBrandDescriptionByHandle } from "@/lib/strapi/content";
import { searchProducts } from "@/lib/search/products";
import { ProductGrid } from "@/features/shop/components/product-grid";
import {
  ShopSort,
  type SortOption,
} from "@/features/shop/components/shop-sort";
import { ListingLayout } from "@/components/layout/listing-layout";
import { ShopErrorState } from "@/features/shop/components/shop-error-state";
import { ShopEmptyState } from "@/features/shop/components/shop-empty-state";
import { BrandFilters } from "@/components/filters/brand-filters";
import { getPricingContext } from "@/lib/medusa/regions.server";
import { resolveStrapiMediaUrl } from "@/lib/strapi/media";
import {
  copyDynamicOptionParams,
  hasDynamicOptionParams,
  parseDynamicOptionParams,
} from "@/lib/utils/search-params";
import { buildShopUrl, type ShopQueryParams } from "@/lib/utils/url";

// Force dynamic rendering to prevent caching
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    handle: string;
  }>;
  searchParams: Promise<{
    page?: string;
    sort?: SortOption;
    category?: string;
    collection?: string;
    q?: string;
    minPrice?: string;
    maxPrice?: string;
    onSale?: string;
    inStock?: string;
    // Dynamic options (e.g., options_colour, options_size)
    [key: `options_${string}`]: string | undefined;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const [brand, brandDescription] = await Promise.all([
    getBrandByHandle(handle),
    getBrandDescriptionByHandle(handle).catch(() => null),
  ]);

  if (!brand) {
    return {
      title: "Brand Not Found",
    };
  }

  const title = brandDescription?.seo_title || brand.name;
  const description =
    brandDescription?.seo_description ||
    brand.description ||
    `Shop ${brand.name} products at 3D Byte Tech Store.`;

  return {
    title,
    description,
  };
}

/**
 * Check if any filters are active
 */
function hasActiveFilters(
  params: Awaited<PageProps["searchParams"]>,
  effectiveInStock: boolean
): boolean {
  return (
    !!params.category ||
    !!params.collection ||
    params.onSale === "true" ||
    effectiveInStock ||
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
  params: Awaited<PageProps["searchParams"]>,
  sort: string,
  brandHandle: string
): string {
  const queryParams: ShopQueryParams = {
    q: params.q,
    category: params.category,
    collection: params.collection,
    onSale: params.onSale,
    inStock: params.inStock === "false" ? "false" : undefined,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    sort: sort !== "newest" ? sort : undefined,
    page: pageNum > 1 ? pageNum : undefined,
  };

  copyDynamicOptionParams(params, queryParams as Record<string, string | undefined>);

  return buildShopUrl(queryParams, `/brands/${brandHandle}`);
}

function BrandHeaderContent({
  description,
  displayName,
  logo,
  productCount,
  richDescription,
  showProductCount,
}: {
  description: string
  displayName: string
  logo?: { alternativeText?: string | null; url?: string | null } | null
  productCount?: number
  richDescription?: string | null
  showProductCount?: boolean
}) {
  const logoUrl = resolveStrapiMediaUrl(logo?.url)
  const logoAlt = logo?.alternativeText?.trim() || `${displayName} logo`

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {logoUrl && (
        <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-md border border-border bg-background p-3">
          <img
            src={logoUrl}
            alt={logoAlt}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
        <p className="font-mono text-sm text-muted-foreground">{description}</p>
        {showProductCount && typeof productCount === "number" && (
          <p className="font-mono text-sm text-muted-foreground">
            {productCount} {productCount === 1 ? "product" : "products"}
          </p>
        )}
        {richDescription && (
          <div
            className="prose prose-sm mt-3 max-w-none text-muted-foreground dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: richDescription }}
          />
        )}
      </div>
    </div>
  )
}

export default async function BrandPage({
  params,
  searchParams,
}: PageProps) {
  const { handle } = await params;
  const [brand, brandDescription] = await Promise.all([
    getBrandByHandle(handle),
    getBrandDescriptionByHandle(handle).catch(() => null),
  ]);

  if (!brand) {
    notFound();
  }

  const displayName = brandDescription?.brand_name || brand.name;
  const summary =
    brandDescription?.seo_description ||
    brand.description ||
    "Explore products from this brand.";
  const richDescription = brandDescription?.rich_description || null;
  const logo = brandDescription?.brand_logo || null;

  const params_cache = await searchParams;
  const page = Number(params_cache.page) || 1;
  const limit = 20;
  const sort = params_cache.sort || "newest";
  const effectiveInStock = params_cache.inStock !== "false";
  const pricing = await getPricingContext();

  // Parse category filters
  const categoryIds = params_cache.category?.split(",").filter(Boolean) || [];

  // Parse collection filters
  const collectionIds =
    params_cache.collection?.split(",").filter(Boolean) || [];

  // Parse price range
  const minPrice = params_cache.minPrice
    ? Number(params_cache.minPrice)
    : undefined;
  const maxPrice = params_cache.maxPrice
    ? Number(params_cache.maxPrice)
    : undefined;

  // Parse dynamic options from URL
  const options = parseDynamicOptionParams(params_cache);

  // Fetch products from Meilisearch, filtered by brand
  const result = await searchProducts({
    query: params_cache.q,
    page,
    limit,
    sort,
    pricing,
    filters: {
      brandIds: [brand.id], // Always filter by current brand
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      collectionIds: collectionIds.length > 0 ? collectionIds : undefined,
      onSale: params_cache.onSale === "true" ? true : undefined,
      inStock: effectiveInStock ? true : undefined,
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
            <BrandHeaderContent
              description={summary}
              displayName={displayName}
              logo={logo}
              richDescription={richDescription}
            />
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
  const filtersActive = hasActiveFilters(params_cache, effectiveInStock);

  // Handle empty state
  if (result.products.length === 0) {
    return (
      <ListingLayout
        header={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <BrandHeaderContent
              description={summary}
              displayName={displayName}
              logo={logo}
            />
            <ShopSort basePath={`/brands/${handle}`} />
          </div>
        }
        sidebar={<BrandFilters brandId={brand.id} />}
      >
        <ShopEmptyState hasActiveFilters={filtersActive} />
      </ListingLayout>
    );
  }

  // Transform products for ProductGrid compatibility
  const productsForGrid = result.products.map((product) => ({
    id: product.id,
    handle: product.handle,
    title: product.title,
    thumbnail: product.thumbnail,
    variants: product.variants,
    price: product.price,
    currency_code: product.currency_code,
    originalPrice: product.original_price,
    salePrice: product.on_sale ? product.price : undefined,
    discountPercentage: product.discount_percentage,
  }));

  return (
    <ListingLayout
      header={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <BrandHeaderContent
            description={summary}
            displayName={displayName}
            logo={logo}
            productCount={result.totalCount}
            richDescription={richDescription}
            showProductCount
          />
          {result.degradedMode && (
            <span className="font-mono text-sm text-amber-500">
              Limited results
            </span>
          )}
          <ShopSort basePath={`/brands/${handle}`} />
        </div>
      }
      sidebar={<BrandFilters brandId={brand.id} />}
    >
      <div className="space-y-8">
        <ProductGrid
          products={productsForGrid}
          sourceHref={`/brands/${handle}`}
          sourceLabel={displayName}
        />

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
                    href={buildPaginationUrl(
                      pageNum,
                      params_cache,
                      sort,
                      handle
                    )}
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
