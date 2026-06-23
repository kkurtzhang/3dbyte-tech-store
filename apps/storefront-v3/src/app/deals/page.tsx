import type { Metadata } from "next"

import { ListingLayout } from "@/components/layout/listing-layout"
import { resolveCampaignMerchandisingList } from "@/features/campaigns/lib/campaign-merchandising"
import { DealsFilter } from "@/features/shop/components/deals-filter"
import { ShopErrorState } from "@/features/shop/components/shop-error-state"
import { getActiveCampaigns } from "@/lib/medusa/campaigns"
import { getPricingContext } from "@/lib/medusa/regions.server"
import { searchProducts } from "@/lib/search/products"
import { getCampaignPlacements } from "@/lib/strapi/content"

import {
  ActivePromotionsSection,
  DealsHeader,
  MarkdownEmptyState,
  SaleProductsSection,
  SavingsTypeExplainer,
  type DealsGridProduct,
} from "./_components/deals-page-sections"

export const dynamic = "force-dynamic"

interface DealsPageProps {
  searchParams: Promise<{
    page?: string
    minDiscount?: string
    maxDiscount?: string
  }>
}

type DealsProduct = Awaited<ReturnType<typeof searchProducts>>["products"][number]

function isEndingSoon(value?: string | null) {
  if (!value) {
    return false
  }

  const endDate = new Date(value)

  if (Number.isNaN(endDate.getTime())) {
    return false
  }

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return endDate > now && endDate <= sevenDaysFromNow
}

function transformProductForGrid(product: DealsProduct): DealsGridProduct {
  return {
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
    isBundle: product.is_bundle,
    isPreorder: product.is_preorder,
    preorderAvailableDate: product.preorder_available_date,
    bundleItemCount: product.bundle_item_count,
    bundleItemTitles: product.bundle_item_titles,
    availableInBundlesCount: product.available_in_bundles_count,
    inventory_quantity: product.inventory_quantity,
    in_stock: product.in_stock,
  }
}

function buildDiscountFilters(
  productsForGrid: ReturnType<typeof transformProductForGrid>[],
  totalCount: number
) {
  const countAtOrAbove = (discount: number) =>
    productsForGrid.filter(
      (product) => (product.discountPercentage || 0) >= discount
    ).length

  return [
    { id: "all", label: "All Deals", min: undefined, max: undefined, count: totalCount },
    { id: "10", label: "10%+ Off", min: 10, max: undefined, count: countAtOrAbove(10) },
    { id: "20", label: "20%+ Off", min: 20, max: undefined, count: countAtOrAbove(20) },
    { id: "30", label: "30%+ Off", min: 30, max: undefined, count: countAtOrAbove(30) },
    { id: "40", label: "40%+ Off", min: 40, max: undefined, count: countAtOrAbove(40) },
    { id: "50", label: "50%+ Off", min: 50, max: undefined, count: countAtOrAbove(50) },
  ]
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 20
  const minDiscount = params.minDiscount ? Number(params.minDiscount) : undefined
  const maxDiscount = params.maxDiscount ? Number(params.maxDiscount) : undefined
  const hasActiveFilters = minDiscount !== undefined || maxDiscount !== undefined
  const pricing = await getPricingContext()

  const [result, activeCampaigns, campaignPlacements] = await Promise.all([
    searchProducts({
      page,
      limit,
      pricing,
      filters: {
        onSale: true,
        minDiscount,
        maxDiscount,
      },
    }),
    getActiveCampaigns().catch(() => []),
    getCampaignPlacements()
      .then((response) => response.data || [])
      .catch(() => []),
  ])
  const campaigns = resolveCampaignMerchandisingList(
    activeCampaigns,
    campaignPlacements
  )
  const productError = Boolean(result.error)
  const productsForGrid = productError
    ? []
    : result.products.map(transformProductForGrid)
  const totalCount = productError ? 0 : result.totalCount
  const discountFilters = buildDiscountFilters(productsForGrid, totalCount)
  const endingSoonCount = campaigns.filter((campaign) =>
    isEndingSoon(campaign.endsAt)
  ).length
  const showDiscountFilter = !productError && (totalCount > 0 || hasActiveFilters)

  return (
    <ListingLayout
      header={
        <DealsHeader
          endingSoonCount={endingSoonCount}
          productError={productError}
          promotionCount={campaigns.length}
          saleProductCount={totalCount}
        />
      }
      sidebar={
        showDiscountFilter ? (
          <DealsFilter
            activeMaxDiscount={maxDiscount}
            activeMinDiscount={minDiscount}
            filters={discountFilters}
          />
        ) : null
      }
    >
      <div className="space-y-10">
        <SavingsTypeExplainer />
        <ActivePromotionsSection campaigns={campaigns} />

        {productError ? (
          <ShopErrorState />
        ) : productsForGrid.length === 0 ? (
          <MarkdownEmptyState
            hasActiveFilters={hasActiveFilters}
            hasPromotions={campaigns.length > 0}
          />
        ) : (
          <SaleProductsSection
            currentPage={page}
            degradedMode={result.degradedMode}
            maxDiscount={maxDiscount}
            minDiscount={minDiscount}
            pageSize={limit}
            products={productsForGrid}
            totalCount={totalCount}
          />
        )}
      </div>
    </ListingLayout>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Deals & Promotions | Save on 3D Printing Supplies",
    description: "Shop current sale prices and promotion codes on 3D printing filaments, parts, and accessories.",
  }
}
