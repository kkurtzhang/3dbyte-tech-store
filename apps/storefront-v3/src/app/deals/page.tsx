import type { Metadata } from "next";
import Link from "next/link";
import { CampaignBand } from "@/features/campaigns/components/campaign-band";
import { resolveCampaignMerchandising } from "@/features/campaigns/lib/campaign-merchandising";
import { searchProducts } from "@/lib/search/products";
import { ProductGrid } from "@/features/shop/components/product-grid";
import { DealsFilter } from "@/features/shop/components/deals-filter";
import { ListingLayout } from "@/components/layout/listing-layout";
import { ListingPagination } from "@/components/layout/listing-pagination";
import { Button } from "@/components/ui/button";
import { Tag, ArrowRight } from "lucide-react";
import { ShopErrorState } from "@/features/shop/components/shop-error-state";
import { ShopEmptyState } from "@/features/shop/components/shop-empty-state";
import { getActiveCampaigns } from "@/lib/medusa/campaigns";
import { getPricingContext } from "@/lib/medusa/regions.server";
import { getCampaignPlacements } from "@/lib/strapi/content";

// Force dynamic rendering to prevent caching
export const dynamic = "force-dynamic";

interface DealsPageProps {
  searchParams: Promise<{
    page?: string;
    minDiscount?: string;
    maxDiscount?: string;
  }>;
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = 20;
  const minDiscount = params.minDiscount ? Number(params.minDiscount) : undefined;
  const maxDiscount = params.maxDiscount ? Number(params.maxDiscount) : undefined;
  const pricing = await getPricingContext();

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
  ]);
  const campaign = resolveCampaignMerchandising(
    activeCampaigns,
    campaignPlacements
  );

  // Handle error state
  if (result.error) {
    return (
      <ListingLayout
        header={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <Tag className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Deals & Promotions</h1>
                <p className="font-mono text-sm text-muted-foreground">
                  Unable to load products
                </p>
              </div>
            </div>
          </div>
        }
        sidebar={null}
      >
        <ShopErrorState />
      </ListingLayout>
    );
  }

  const totalCount = result.totalCount;

  // Handle empty state
  if (result.products.length === 0) {
    return (
      <ListingLayout
        header={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <Tag className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Deals & Promotions</h1>
                <p className="font-mono text-sm text-muted-foreground">
                  0 products on sale
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/shop">
                  Browse All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        }
        sidebar={null}
      >
        <ShopEmptyState hasActiveFilters={false} />
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
    price: product.price,
    currency_code: product.currency_code,
    originalPrice: product.original_price,
    salePrice: product.on_sale ? product.price : undefined,
    discountPercentage: product.discount_percentage,
  }));

  // Generate discount filter options from actual discount data only.
  const discountFilters = [
    { id: "all", label: "All Deals", min: undefined, max: undefined, count: totalCount },
    { id: "10", label: "10%+ Off", min: 10, max: undefined, count: productsForGrid.filter((product) => (product.discountPercentage || 0) >= 10).length },
    { id: "20", label: "20%+ Off", min: 20, max: undefined, count: productsForGrid.filter((product) => (product.discountPercentage || 0) >= 20).length },
    { id: "30", label: "30%+ Off", min: 30, max: undefined, count: productsForGrid.filter((product) => (product.discountPercentage || 0) >= 30).length },
    { id: "40", label: "40%+ Off", min: 40, max: undefined, count: productsForGrid.filter((product) => (product.discountPercentage || 0) >= 40).length },
    { id: "50", label: "50%+ Off", min: 50, max: undefined, count: productsForGrid.filter((product) => (product.discountPercentage || 0) >= 50).length },
  ];

  return (
    <ListingLayout
      header={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <Tag className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Deals & Promotions</h1>
              <p className="font-mono text-sm text-muted-foreground">
                {totalCount} {totalCount === 1 ? "product" : "products"} on sale
                {result.degradedMode && (
                  <span className="ml-2 text-amber-500">(limited results)</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/shop">
                Browse All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      }
      sidebar={
        <DealsFilter
          activeMinDiscount={minDiscount}
          activeMaxDiscount={maxDiscount}
          filters={discountFilters}
        />
      }
    >
      <div className="space-y-8">
        {campaign ? <CampaignBand campaign={campaign} compact /> : null}

        <ProductGrid products={productsForGrid} />

        <ListingPagination
          buildHref={(pageNumber) => {
            const pageParams = new URLSearchParams();
            if (pageNumber > 1) pageParams.set("page", pageNumber.toString());
            if (minDiscount) pageParams.set("minDiscount", minDiscount.toString());
            if (maxDiscount) pageParams.set("maxDiscount", maxDiscount.toString());

            const query = pageParams.toString();
            return `/deals${query ? `?${query}` : ""}`;
          }}
          currentPage={page}
          pageSize={limit}
          totalItems={totalCount}
        />
      </div>
    </ListingLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Deals & Promotions | Save on 3D Printing Supplies",
    description: "Shop our best deals and promotions on 3D printing filaments, parts, and accessories. Save up to 50% off!",
  };
}
