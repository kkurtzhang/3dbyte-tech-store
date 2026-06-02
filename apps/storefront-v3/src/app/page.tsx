import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { BookOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  CollectionGrid,
  CollectionsSkeleton,
} from "@/features/collections/components/collection-grid"
import { buildCollectionContentByHandle } from "@/features/collections/lib/collection-cards"
import { getCmsIcon } from "@/features/cms/components/cms-icon-map"
import { ProductCard } from "@/features/product/components/product-card"
import { getFeaturedCollections } from "@/lib/medusa/collections"
import { getPricingContext } from "@/lib/medusa/regions.server"
import { searchProducts, type ProductSearchResult } from "@/lib/search/products"
import {
  getCollectionDescriptions,
  getHomepage,
} from "@/lib/strapi/content"
import { resolveStrapiMediaUrl } from "@/lib/strapi/media"

import type {
  HomepageCta,
  HomepageGuidesHelpSection,
  HomepageSection,
  HomepageSupportStrip,
} from "@/lib/strapi/types"

export const dynamic = "force-dynamic"

interface Product {
  id: string
  handle: string
  title: string
  thumbnail?: string
  price: number
  currency_code: string
  original_price?: number
  on_sale: boolean
  variants?: Array<{
    id: string
    sku?: string
    title: string
  }>
}

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

function ProductGrid({ products, error }: { products: Product[]; error?: boolean }) {
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
          amount: product.price,
          currency_code: product.currency_code,
        }

        return (
          <ProductCard
            key={product.id}
            id={product.id}
            handle={product.handle}
            title={product.title}
            thumbnail={product.thumbnail || ""}
            price={displayPrice}
            originalPrice={product.original_price}
          />
        )
      })}
    </div>
  )
}

const commerceLoadError: ProductSearchResult = {
  products: [],
  totalCount: 0,
  facets: {},
  error: true,
}

function textOrFallback(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim()

  return trimmed || fallback
}

function safeHref(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return fallback
  }

  return trimmed.startsWith("/") ? trimmed : fallback
}

function isEnabled(section?: { Enabled?: boolean | null } | null) {
  return section?.Enabled !== false
}

async function loadHomepageProducts() {
  try {
    const pricing = await getPricingContext()

    return await searchProducts({
      sort: "newest",
      limit: 8,
      pricing,
    })
  } catch {
    return commerceLoadError
  }
}

async function loadHomepageCollections() {
  try {
    return await getFeaturedCollections(4)
  } catch {
    return []
  }
}

function SectionHeader({
  section,
  fallbackHeading,
  fallbackText,
  fallbackCta,
}: {
  section?: HomepageSection | null
  fallbackHeading: string
  fallbackText?: string
  fallbackCta: HomepageCta
}) {
  const ctaText = textOrFallback(section?.CTA?.BtnText, fallbackCta.BtnText || "View All")
  const ctaHref = safeHref(section?.CTA?.BtnLink, fallbackCta.BtnLink || "/shop")

  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {section?.Eyebrow ? (
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {section.Eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-bold tracking-tight">
          {textOrFallback(section?.Heading, fallbackHeading)}
        </h2>
        {section?.Text || fallbackText ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {textOrFallback(section?.Text, fallbackText || "")}
          </p>
        ) : null}
      </div>
      <Button asChild variant="ghost" size="sm">
        <Link href={ctaHref}>{ctaText}</Link>
      </Button>
    </div>
  )
}

function SupportStrip({ section }: { section?: HomepageSupportStrip | null }) {
  if (!isEnabled(section) || (!section?.Label && !section?.Text && !section?.CTA?.BtnText)) {
    return null
  }

  return (
    <section className="mb-16 rounded-lg border bg-card p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          {section.Label ? (
            <h2 className="text-xl font-semibold tracking-tight">{section.Label}</h2>
          ) : null}
          {section.Text ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.Text}</p>
          ) : null}
        </div>
        {section.CTA?.BtnText ? (
          <Button asChild className="rounded-sm font-mono text-sm">
            <Link href={safeHref(section.CTA.BtnLink, "/contact")}>
              {section.CTA.BtnText}
            </Link>
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function GuidesHelpSection({ section }: { section?: HomepageGuidesHelpSection | null }) {
  const cards = section?.Cards?.filter((card) => card.Title?.trim()) ?? []

  if (!isEnabled(section) || !section?.Heading || cards.length === 0) {
    return null
  }

  return (
    <section className="mb-16 border-t pt-12">
      <div className="mb-6">
        {section.Eyebrow ? (
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {section.Eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-bold tracking-tight">{section.Heading}</h2>
        {section.Text ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {section.Text}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = getCmsIcon(card.Icon, BookOpen)

          return (
            <Link
              key={card.id}
              href={safeHref(card.Link, "/help")}
              className="group rounded-lg border bg-card p-5 transition-colors hover:border-primary/70"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-md bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {card.Eyebrow ? (
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {card.Eyebrow}
                    </p>
                  ) : null}
                  <h3 className="mt-1 font-semibold group-hover:text-primary">
                    {card.Title}
                  </h3>
                  {card.Text ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {card.Text}
                    </p>
                  ) : null}
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                    {textOrFallback(card.LinkText, "Open resource")}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default async function Home() {
  const [productsResult, collections, homepageData, collectionDescriptions] =
    await Promise.all([
      loadHomepageProducts(),
      loadHomepageCollections(),
      getHomepage().catch(() => null),
      getCollectionDescriptions()
        .then((response) => response.data || [])
        .catch(() => []),
    ])

  const collectionContentByHandle =
    buildCollectionContentByHandle(collectionDescriptions)
  const home = homepageData?.data
  const hero = home?.HeroBanner
  const midBanner = home?.MidBanner
  const trustStats = home?.TrustStats || []
  const quickLinks = home?.QuickLinks || []
  const heroImage = hero?.Image
  const heroImageSrc = resolveStrapiMediaUrl(heroImage?.url)
  const collectionsSection = home?.CollectionsSection
  const productsSection = home?.ProductsSection

  const title = hero?.Headline || "Engineered for Precision."
  const subtitle =
    hero?.Text ||
    "Curated 3D printing components, high-performance materials, and practical hardware for serious builders."
  const primaryCtaText = hero?.CTA?.BtnText || "BROWSE CATALOG"
  const primaryCtaLink = safeHref(hero?.CTA?.BtnLink, "/shop")
  const secondaryCtaText = hero?.SecondaryCTA?.BtnText || "SHOP BRANDS"
  const secondaryCtaLink = safeHref(hero?.SecondaryCTA?.BtnLink, "/brands")
  const heroEyebrow = hero?.Eyebrow || "3D BYTE TECH"
  const featureTags =
    hero?.FeatureTags?.map((tag) => tag.Text).filter(Boolean) || [
      "PRINTER PARTS",
      "HIGH-PERF FILAMENTS",
      "PRECISION HARDWARE",
    ]

  return (
    <div className="container py-10">
      <section
        className={`mx-auto grid max-w-[1120px] gap-8 py-8 md:py-12 lg:py-20 ${
          heroImageSrc && heroImage ? "lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)] lg:items-center" : ""
        }`}
      >
        <div className="flex flex-col items-start gap-4">
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
          <div className="flex w-full flex-col items-stretch justify-start gap-2 py-2 sm:w-auto sm:flex-row sm:items-center">
            <Button asChild size="lg" className="w-full rounded-sm font-mono text-sm sm:w-auto">
              <Link href={primaryCtaLink}>{primaryCtaText}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full rounded-sm font-mono text-sm sm:w-auto">
              <Link href={secondaryCtaLink}>{secondaryCtaText}</Link>
            </Button>
          </div>
          {trustStats.length > 0 ? (
            <div className="grid w-full grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
              {trustStats.map((stat) => (
                <div key={stat.id} className="rounded border bg-card p-3">
                  <div className="font-mono text-lg font-bold">{stat.Value}</div>
                  <div className="text-xs text-muted-foreground">{stat.Label}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {heroImageSrc && heroImage ? (
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <Image
              src={heroImageSrc}
              alt={heroImage.alternativeText || hero?.Headline || "3DByte Tech homepage hero"}
              width={heroImage.width}
              height={heroImage.height}
              className="h-auto w-full object-cover"
            />
          </div>
        ) : null}
      </section>

      {quickLinks.length > 0 ? (
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
                <Link href={safeHref(link.BtnLink, "/shop")}>{link.BtnText || "Explore"}</Link>
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {collections.length > 0 && isEnabled(collectionsSection) ? (
        <section className="mb-16">
          <SectionHeader
            section={collectionsSection}
            fallbackHeading="Featured Collections"
            fallbackCta={{ id: 0, BtnText: "View All →", BtnLink: "/collections" }}
          />
          <Suspense fallback={<CollectionsSkeleton />}>
            <CollectionGrid
              collections={collections}
              collectionContentByHandle={collectionContentByHandle}
            />
          </Suspense>
        </section>
      ) : null}

      {midBanner?.Headline ? (
        <section className="mb-16 mt-16 rounded border bg-card p-6 md:p-8">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
            SYSTEM UPDATE
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">{midBanner.Headline}</h2>
          {midBanner.Text ? (
            <p className="mt-2 max-w-2xl text-muted-foreground">{midBanner.Text}</p>
          ) : null}
          {midBanner.CTA?.BtnText ? (
            <div className="mt-4">
              <Button asChild variant="secondary" className="rounded-sm font-mono text-xs">
                <Link href={safeHref(midBanner.CTA.BtnLink, "/shop")}>
                  {midBanner.CTA.BtnText}
                </Link>
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {isEnabled(productsSection) ? (
        <section className="mb-16">
          <SectionHeader
            section={productsSection}
            fallbackHeading="Featured Products"
            fallbackCta={{ id: 0, BtnText: "View All →", BtnLink: "/shop" }}
          />
          {!productsResult.error && productsResult.totalCount > 0 ? (
            <p aria-hidden="true" className="-mt-5 mb-5 text-xs text-muted-foreground">
              {productsResult.totalCount} indexed products
            </p>
          ) : null}
          <Suspense fallback={<ProductsSkeleton />}>
            <ProductGrid
              products={productsResult.products}
              error={productsResult.error}
            />
          </Suspense>
        </section>
      ) : null}

      <GuidesHelpSection section={home?.GuidesHelpSection} />
      <SupportStrip section={home?.SupportStrip} />
    </div>
  )
}
