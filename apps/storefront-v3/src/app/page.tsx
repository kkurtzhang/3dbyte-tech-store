import { Suspense } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  CollectionGrid,
  CollectionsSkeleton,
} from "@/features/collections/components/collection-grid"
import { buildCollectionContentByHandle } from "@/features/collections/lib/collection-cards"
import { HomepageFeatureBanner } from "@/features/home/components/homepage-feature-banner"
import { HomepageHero } from "@/features/home/components/homepage-hero"
import { HomepageLinkCardGrid } from "@/features/home/components/homepage-link-card-grid"
import { HomepageSectionHeader } from "@/features/home/components/homepage-section-header"
import { HomepageSupportStrip } from "@/features/home/components/homepage-support-strip"
import { buildHomepageViewModel } from "@/features/home/lib/homepage-content"
import { ProductCard } from "@/features/product/components/product-card"
import { getFeaturedCollections } from "@/lib/medusa/collections"
import { searchProducts } from "@/lib/search/products"
import {
  getCollectionDescriptions,
  getHomepage,
} from "@/lib/strapi/content"

// Force dynamic rendering to avoid build-time CMS dependency
export const dynamic = "force-dynamic"

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

function ProductGrid({ products, error }: { products: Product[]; error?: boolean }) {
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

  const collectionContentByHandle =
    buildCollectionContentByHandle(collectionDescriptions)
  const homepage = buildHomepageViewModel(homepageData?.data || null)

  return (
    <div className="bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.1),_transparent_28%),linear-gradient(to_bottom,_rgba(248,250,252,0.96),_rgba(248,250,252,1))] dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_24%),linear-gradient(to_bottom,_rgba(2,6,23,0.98),_rgba(2,6,23,1))]">
      <div className="container space-y-16 py-8 md:py-10 lg:space-y-20 lg:py-12">
        <HomepageHero hero={homepage.hero} trustStats={homepage.trustStats} />

        {homepage.quickLinks.length > 0 ? (
          <section className="space-y-6">
            <HomepageSectionHeader
              eyebrow="START HERE"
              heading={homepage.quickLinksHeading}
              text="Use faster entry points when you already know whether you want catalog breadth, curated collections, trusted brands, or practical buying guides."
            />
            <HomepageLinkCardGrid items={homepage.quickLinks} />
          </section>
        ) : null}

        {homepage.collectionsSection.enabled && collections.length > 0 ? (
          <section className="space-y-6">
            <HomepageSectionHeader
              eyebrow={homepage.collectionsSection.eyebrow}
              heading={homepage.collectionsSection.heading}
              text={homepage.collectionsSection.text}
              ctaLink={homepage.collectionsSection.ctaLink}
              ctaText={homepage.collectionsSection.ctaText}
            />
            <Suspense fallback={<CollectionsSkeleton />}>
              <CollectionGrid
                collections={collections}
                collectionContentByHandle={collectionContentByHandle}
              />
            </Suspense>
          </section>
        ) : null}

        {homepage.midBanner?.Headline ? (
          <HomepageFeatureBanner banner={homepage.midBanner} />
        ) : null}

        {homepage.productsSection.enabled ? (
          <section className="space-y-6">
            <HomepageSectionHeader
              eyebrow={homepage.productsSection.eyebrow}
              heading={homepage.productsSection.heading}
              text={homepage.productsSection.text}
              ctaLink={homepage.productsSection.ctaLink}
              ctaText={homepage.productsSection.ctaText}
            />

            <Suspense fallback={<ProductsSkeleton />}>
              <ProductGrid
                products={productsResult.products}
                error={productsResult.error}
              />
            </Suspense>
          </section>
        ) : null}

        {homepage.guidesHelpSection.enabled ? (
          <section className="space-y-6">
            <HomepageSectionHeader
              eyebrow={homepage.guidesHelpSection.eyebrow}
              heading={homepage.guidesHelpSection.heading}
              text={homepage.guidesHelpSection.text}
            />
            <HomepageLinkCardGrid items={homepage.guidesHelpSection.cards} />
          </section>
        ) : null}

        <HomepageSupportStrip strip={homepage.supportStrip} />
      </div>
    </div>
  )
}
