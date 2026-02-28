import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getCollectionByHandle } from "@/lib/medusa/collections"
import { searchProducts } from "@/lib/search/products"
import { ProductGrid } from "@/features/shop/components/product-grid"
import { ShopSort, type SortOption } from "@/features/shop/components/shop-sort"
import { ShopErrorState } from "@/features/shop/components/shop-error-state"
import { ShopEmptyState } from "@/features/shop/components/shop-empty-state"
import { ListingLayout } from "@/components/layout/listing-layout"
import { CollectionFilters } from "@/components/filters/collection-filters"
import { parseDynamicOptionParams } from "@/lib/utils/search-params"

// Force dynamic rendering to prevent caching
export const dynamic = "force-dynamic"

interface CollectionPageProps {
  params: Promise<{ handle: string }>
  searchParams: Promise<{
    page?: string
    sort?: SortOption
    category?: string
    brand?: string
    onSale?: string
    inStock?: string
    minPrice?: string
    maxPrice?: string
    // Dynamic options (e.g., options_colour, options_size)
    [key: `options_${string}`]: string | undefined
  }>
}

/**
 * Build collection URL with query params preserving filters
 */
function buildCollectionUrl(
  collectionHandle: string,
  pageNum: number,
  sort: string,
  filters: {
    category?: string
    brand?: string
    onSale?: string
    inStock?: string
    minPrice?: string
    maxPrice?: string
    options?: Record<string, string[]>
  }
): string {
  const params = new URLSearchParams()

  if (pageNum > 1) params.set("page", pageNum.toString())
  if (sort !== "newest") params.set("sort", sort)
  if (filters.category) params.set("category", filters.category)
  if (filters.brand) params.set("brand", filters.brand)
  if (filters.onSale) params.set("onSale", filters.onSale)
  if (filters.inStock) params.set("inStock", filters.inStock)
  if (filters.minPrice) params.set("minPrice", filters.minPrice)
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice)

  // Add dynamic options
  if (filters.options) {
    Object.entries(filters.options).forEach(([key, values]) => {
      if (values.length > 0) {
        params.set(`options_${key}`, values.join(","))
      }
    })
  }

  const queryString = params.toString()
  return `/collections/${collectionHandle}${queryString ? `?${queryString}` : ""}`
}

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const { handle } = await params
  const search = await searchParams
  const page = Number(search.page) || 1
  const limit = 20
  const sort = search.sort || "newest"

  // Fetch collection data
  const collection = await getCollectionByHandle(handle)

  if (!collection) {
    notFound()
  }

  // Parse filter params from URL
  const categoryIds = search.category?.split(",").filter(Boolean) || []
  const brandIds = search.brand?.split(",").filter(Boolean) || []
  const minPrice = search.minPrice ? Number(search.minPrice) : undefined
  const maxPrice = search.maxPrice ? Number(search.maxPrice) : undefined
  const options = parseDynamicOptionParams(search)

  // Search products using Meilisearch with collection and additional filters
  const result = await searchProducts({
    page,
    limit,
    sort,
    filters: {
      collectionIds: [collection.id],
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      brandIds: brandIds.length > 0 ? brandIds : undefined,
      onSale: search.onSale === "true" ? true : undefined,
      inStock: search.inStock === "true" ? true : undefined,
      minPrice,
      maxPrice,
      options: Object.keys(options).length > 0 ? options : undefined,
    },
  })

  // Handle error state
  if (result.error) {
    return (
      <ListingLayout
        header={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {collection.title}
              </h1>
              <p className="mt-2 font-mono text-sm text-muted-foreground">
                Unable to load products
              </p>
            </div>
          </div>
        }
        sidebar={null}
      >
        <ShopErrorState />
      </ListingLayout>
    )
  }

  // Handle empty state
  if (result.products.length === 0) {
    return (
      <ListingLayout
        header={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {collection.title}
              </h1>
              <p className="mt-2 font-mono text-sm text-muted-foreground">
                0 products
              </p>
            </div>
            <ShopSort basePath={`/collections/${handle}`} />
          </div>
        }
        sidebar={
          <CollectionFilters
            collectionId={collection.id}
            collectionHandle={handle}
          />
        }
      >
        <ShopEmptyState hasActiveFilters={true} />
      </ListingLayout>
    )
  }

  const totalPages = Math.ceil(result.totalCount / limit)

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
  }))

  return (
    <ListingLayout
      header={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {collection.title}
            </h1>
            <p className="mt-2 font-mono text-sm text-muted-foreground">
              {result.totalCount}{" "}
              {result.totalCount === 1 ? "product" : "products"}
              {result.degradedMode && (
                <span className="ml-2 text-amber-500">(limited results)</span>
              )}
            </p>
          </div>
          <ShopSort basePath={`/collections/${handle}`} />
        </div>
      }
      sidebar={
        <CollectionFilters
          collectionId={collection.id}
          collectionHandle={handle}
        />
      }
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
                const pageNum = i + 1
                const isCurrent = pageNum === page

                return (
                  <a
                    key={pageNum}
                    href={buildCollectionUrl(handle, pageNum, sort, {
                      category: search.category,
                      brand: search.brand,
                      onSale: search.onSale,
                      inStock: search.inStock,
                      minPrice: search.minPrice,
                      maxPrice: search.maxPrice,
                      options,
                    })}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-md border font-mono text-sm transition-colors ${
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/50 hover:bg-accent"
                    }`}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {pageNum}
                  </a>
                )
              })}
            </nav>
          </div>
        )}
      </div>
    </ListingLayout>
  )
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { handle } = await params
  const collection = await getCollectionByHandle(handle)

  if (!collection) {
    return {
      title: "Collection Not Found",
    }
  }

  return {
    title: `${collection.title} | Collection`,
    description: `Browse ${collection.title} collection.`,
  }
}
