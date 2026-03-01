import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { searchProducts } from "@/lib/search/products"
import { getCollectionDescriptions, getHomepage } from "@/lib/strapi/content"
import { getFeaturedCollections } from "@/lib/medusa/collections"
import { ProductCard } from "@/features/product/components/product-card"
import type { CollectionDescriptionData } from "@/lib/strapi/types"
import Link from "next/link"

// Force dynamic rendering to avoid build-time CMS dependency
export const dynamic = 'force-dynamic'

// Loading skeleton for products
function ProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-80 animate-pulse rounded-lg bg-muted"
        />
      ))}
    </div>
  )
}

// Loading skeleton for collections
function CollectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="aspect-[4/5] animate-pulse rounded-lg bg-muted"
        />
      ))}
    </div>
  )
}

// Collection card component
function resolveStrapiMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`
}

function CollectionCard({
  collection,
  cmsContent,
}: {
  collection: any
  cmsContent?: CollectionDescriptionData
}) {
  const imageUrl =
    resolveStrapiMediaUrl(cmsContent?.Image?.url) ||
    (collection.metadata?.image as string | undefined)
  const displayTitle = cmsContent?.Title || collection.title
  const displayDescription =
    cmsContent?.Description ||
    (collection.metadata?.product_count as string | undefined) ||
    "Shop now"
  
  return (
    <Link 
      href={`/collections/${collection.handle}`}
      className="group relative block overflow-hidden rounded-lg bg-muted"
    >
      <div className="aspect-[4/5] w-full">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayTitle}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="font-mono text-4xl text-muted-foreground/30">
              {displayTitle?.charAt(0) || "C"}
            </span>
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
        <h3 className="text-lg font-bold text-white">{displayTitle}</h3>
        <p className="line-clamp-2 text-sm text-white/70 font-mono">
          {displayDescription}
        </p>
      </div>
    </Link>
  )
}

// Collection grid component
function CollectionGrid({
  collections,
  collectionContentByHandle,
}: {
  collections: any[]
  collectionContentByHandle: Map<string, CollectionDescriptionData>
}) {
  if (collections.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {collections.map((collection) => {
        const handleKey = (collection.handle || "").toLowerCase()
        return (
          <CollectionCard
            key={collection.id}
            collection={collection}
            cmsContent={collectionContentByHandle.get(handleKey)}
          />
        )
      })}
    </div>
  )
}

// Product grid component for Meilisearch results
interface Product {
  id: string
  handle: string
  title: string
  thumbnail?: string
  price_aud: number
  original_price_aud?: number
  on_sale: boolean
  variants?: Array<{
    id: string
    sku?: string
    title: string
  }>
}

function ProductGrid({ products, totalCount, error }: { products: Product[]; totalCount: number; error?: boolean }) {
  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-destructive"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium">Unable to load products</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Please check back later or browse our catalog
        </p>
        <Button asChild variant="outline">
          <Link href="/shop">Browse All Products</Link>
        </Button>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-muted-foreground"
          >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 2 1.58h9.78a2 2 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium">No products found</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Check back later for new arrivals
        </p>
        <Button asChild variant="outline">
          <Link href="/shop">Browse All Products</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => {
        const displayPrice = {
          amount: product.price_aud, // Meilisearch returns prices in dollars
          currency_code: "aud",
        }

        return (
          <ProductCard
            key={product.id}
            id={product.id}
            handle={product.handle}
            title={product.title}
            thumbnail={product.thumbnail || ""}
            price={displayPrice}
            originalPrice={product.original_price_aud ?? undefined}
          />
        )
      })}
    </div>
  )
}

export default async function Home() {
  // Fetch featured data in parallel
  const [productsResult, collections, homepageData, collectionDescriptions] =
    await Promise.all([
      searchProducts({
        sort: "newest",
        limit: 8,
      }),
      getFeaturedCollections(4),
      getHomepage().catch(() => null),
      getCollectionDescriptions()
        .then((response) => response.data || [])
        .catch(() => []),
    ])

  const collectionContentByHandle = new Map(
    collectionDescriptions.map((entry) => [entry.Handle.toLowerCase(), entry])
  )
  const home = homepageData?.data
  const hero = home?.HeroBanner
  const midBanner = home?.MidBanner
  const trustStats = home?.TrustStats || []
  const quickLinks = home?.QuickLinks || []

  const title = hero?.Headline || "Engineered for Precision."
  const subtitle =
    hero?.Text ||
    "Premium Voron kits, high-performance materials, and precision components for serious builders."
  const primaryCtaText = hero?.CTA?.BtnText || "BROWSE CATALOG"
  const primaryCtaLink = hero?.CTA?.BtnLink || "/shop"
  const secondaryCtaText = hero?.SecondaryCTA?.BtnText || "SHOP BRANDS"
  const secondaryCtaLink = hero?.SecondaryCTA?.BtnLink || "/brands"
  const heroEyebrow = hero?.Eyebrow || "3D BYTE THE LAB"
  const featureTags =
    hero?.FeatureTags?.map((tag) => tag.Text).filter(Boolean) || [
      "VORON KITS",
      "HIGH-PERF FILAMENTS",
      "PRECISION HARDWARE",
    ]

  return (
    <div className="container py-10">
      {/* Hero Section */}
      <section className="mx-auto flex max-w-[980px] flex-col items-start gap-4 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-20">
        <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
          {heroEyebrow}
        </p>
        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
          {title === "Engineered for Precision." ? (
            <>Engineered for <span className="text-primary">Precision</span>.</>
          ) : (
            title
          )}
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          {subtitle}
        </p>
        <div className="flex flex-wrap gap-2">
          {featureTags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-border bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex w-full items-center justify-start gap-2 py-2">
          <Button asChild size="lg" className="rounded-sm font-mono text-sm">
            <Link href={primaryCtaLink}>{primaryCtaText}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-sm font-mono text-sm">
            <Link href={secondaryCtaLink}>{secondaryCtaText}</Link>
          </Button>
        </div>
        {trustStats.length > 0 && (
          <div className="grid w-full grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            {trustStats.map((stat) => (
              <div key={stat.id} className="rounded border bg-card p-3">
                <div className="font-mono text-lg font-bold">{stat.Value}</div>
                <div className="text-xs text-muted-foreground">{stat.Label}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {quickLinks.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              {home?.QuickLinksHeading || "Shop By Focus"}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {quickLinks.map((link, idx) => (
              <Button
                key={`${link.BtnText || "link"}-${idx}`}
                asChild
                variant="outline"
                className="justify-start rounded-sm font-mono text-xs"
              >
                <Link href={link.BtnLink || "/shop"}>{link.BtnText || "Explore"}</Link>
              </Button>
            ))}
          </div>
        </section>
      )}

      {/* Featured Collections Section */}
      {collections.length > 0 && (
        <section className="mb-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Featured Collections</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/collections">View All →</Link>
            </Button>
          </div>

          <Suspense fallback={<CollectionsSkeleton />}>
            <CollectionGrid
              collections={collections}
              collectionContentByHandle={collectionContentByHandle}
            />
          </Suspense>
        </section>
      )}

      {midBanner?.Headline && (
        <section className="mb-16 mt-16 rounded border bg-card p-6 md:p-8">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
            SYSTEM UPDATE
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">{midBanner.Headline}</h2>
          {midBanner.Text && (
            <p className="mt-2 max-w-2xl text-muted-foreground">{midBanner.Text}</p>
          )}
          {midBanner.CTA?.BtnText && (
            <div className="mt-4">
              <Button asChild variant="secondary" className="rounded-sm font-mono text-xs">
                <Link href={midBanner.CTA.BtnLink || "/shop"}>{midBanner.CTA.BtnText}</Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Featured Products Section */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">
            Featured Products
            {!productsResult.error && productsResult.totalCount > 0 && ` (${productsResult.totalCount})`}
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/shop">View All →</Link>
          </Button>
        </div>

        <Suspense fallback={<ProductsSkeleton />}>
          <ProductGrid
            products={productsResult.products}
            totalCount={productsResult.totalCount}
            error={productsResult.error}
          />
        </Suspense>
      </section>
    </div>
  )
}
