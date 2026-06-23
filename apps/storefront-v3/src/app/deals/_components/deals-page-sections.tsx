import Link from "next/link"
import { ArrowRight, BadgePercent, Clock3, Tag } from "lucide-react"

import { ListingPagination } from "@/components/layout/listing-pagination"
import { Button } from "@/components/ui/button"
import { CampaignPromotionCard } from "@/features/campaigns/components/campaign-promotion-card"
import { ProductGrid } from "@/features/shop/components/product-grid"

import type { CampaignMerchandising } from "@/features/campaigns/lib/campaign-merchandising"
import type { ProductLike } from "@/features/shop/components/product-grid"

export type DealsGridProduct = ProductLike & {
  discountPercentage?: number
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function DealsHeader({
  endingSoonCount,
  productError,
  promotionCount,
  saleProductCount,
}: {
  endingSoonCount: number
  productError: boolean
  promotionCount: number
  saleProductCount: number
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/10">
          <Tag className="h-6 w-6 text-red-500" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Deals & Promotions</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Current markdowns, promo codes, and limited-time offers for 3D printing supplies.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-sm border bg-card px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {pluralize(promotionCount, "active promotion")}
            </span>
            <span className="inline-flex items-center rounded-sm border bg-card px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {productError
                ? "Sale products unavailable"
                : `${pluralize(saleProductCount, "product")} on sale`}
            </span>
            {endingSoonCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-sm border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-amber-600">
                <Clock3 className="h-3 w-3" />
                {pluralize(endingSoonCount, "ending soon offer")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <Button variant="outline" asChild>
        <Link href="/shop">
          Browse All
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

export function SavingsTypeExplainer() {
  return (
    <section
      aria-label="Ways to save"
      className="grid gap-3 border-y py-4 sm:grid-cols-2"
    >
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-red-500/10">
          <Tag className="h-4 w-4 text-red-500" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Sale prices</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Already reflected on product cards.
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary/10">
          <BadgePercent className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Promo codes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Apply in cart or checkout.
          </p>
        </div>
      </div>
    </section>
  )
}

export function ActivePromotionsSection({
  campaigns,
}: {
  campaigns: CampaignMerchandising[]
}) {
  if (campaigns.length === 0) {
    return null
  }

  return (
    <section className="space-y-4" aria-labelledby="active-promotions-heading">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Promotions
        </p>
        <h2 id="active-promotions-heading" className="mt-1 text-xl font-bold tracking-tight">
          Active Promotions
        </h2>
      </div>
      <div className={campaigns.length === 1 ? "grid gap-4" : "grid gap-4 xl:grid-cols-2"}>
        {campaigns.map((campaign) => (
          <CampaignPromotionCard
            campaign={campaign}
            key={campaign.id}
            wide={campaigns.length === 1}
          />
        ))}
      </div>
    </section>
  )
}

export function MarkdownEmptyState({
  hasActiveFilters,
  hasPromotions,
}: {
  hasActiveFilters: boolean
  hasPromotions: boolean
}) {
  return (
    <div className="rounded-lg border border-dashed bg-card p-8 text-center">
      <h2 className="text-lg font-semibold">
        {hasActiveFilters
          ? "No sale products match those filters."
          : hasPromotions
            ? "No product markdowns are indexed right now."
            : "No active deals right now."}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {hasPromotions
          ? "Promo codes may still apply in cart."
          : "Check back soon or browse the full catalog."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {hasActiveFilters ? (
          <Button variant="outline" asChild>
            <Link href="/deals">Clear filters</Link>
          </Button>
        ) : null}
        <Button variant={hasActiveFilters ? "secondary" : "outline"} asChild>
          <Link href="/shop">Browse all products</Link>
        </Button>
      </div>
    </div>
  )
}

export function SaleProductsSection({
  currentPage,
  degradedMode,
  maxDiscount,
  minDiscount,
  pageSize,
  products,
  totalCount,
}: {
  currentPage: number
  degradedMode?: boolean
  maxDiscount?: number
  minDiscount?: number
  pageSize: number
  products: DealsGridProduct[]
  totalCount: number
}) {
  return (
    <section className="space-y-5" aria-labelledby="sale-products-heading">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Price list markdowns
        </p>
        <h2 id="sale-products-heading" className="mt-1 text-xl font-bold tracking-tight">
          Products on sale
        </h2>
        {degradedMode ? (
          <p className="mt-2 text-sm text-amber-600">
            Showing limited results while search data refreshes.
          </p>
        ) : null}
      </div>

      <ProductGrid products={products} />

      <ListingPagination
        buildHref={(pageNumber) => {
          const pageParams = new URLSearchParams()
          if (pageNumber > 1) pageParams.set("page", pageNumber.toString())
          if (minDiscount) pageParams.set("minDiscount", minDiscount.toString())
          if (maxDiscount) pageParams.set("maxDiscount", maxDiscount.toString())

          const query = pageParams.toString()
          return `/deals${query ? `?${query}` : ""}`
        }}
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalCount}
      />
    </section>
  )
}
