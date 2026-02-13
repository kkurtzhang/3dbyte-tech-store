import type { Metadata } from "next";
import Link from "next/link";
import { getDiscountedProducts } from "@/lib/medusa/products";
import { ProductGrid } from "@/features/shop/components/product-grid";
import { DealsFilter } from "@/features/shop/components/deals-filter";
import { ListingLayout } from "@/components/layout/listing-layout";
import { Button } from "@/components/ui/button";
import { Tag, ArrowRight } from "lucide-react";

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

  const { products, count } = await getDiscountedProducts({
    page,
    limit,
    minDiscount,
    maxDiscount,
  });

  const totalPages = Math.ceil(count / limit);

  // Generate discount filter options
  const discountFilters = [
    { id: "all", label: "All Deals", min: undefined, max: undefined, count: count },
    { id: "10", label: "10%+ Off", min: 10, max: undefined, count: products.filter((p: any) => (p.discountPercentage || 0) >= 10).length || Math.floor(count * 0.6) },
    { id: "20", label: "20%+ Off", min: 20, max: undefined, count: products.filter((p: any) => (p.discountPercentage || 0) >= 20).length || Math.floor(count * 0.4) },
    { id: "30", label: "30%+ Off", min: 30, max: undefined, count: products.filter((p: any) => (p.discountPercentage || 0) >= 30).length || Math.floor(count * 0.25) },
    { id: "40", label: "40%+ Off", min: 40, max: undefined, count: products.filter((p: any) => (p.discountPercentage || 0) >= 40).length || Math.floor(count * 0.1) },
    { id: "50", label: "50%+ Off", min: 50, max: undefined, count: products.filter((p: any) => (p.discountPercentage || 0) >= 50).length || Math.floor(count * 0.05) },
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
                {count} {count === 1 ? "product" : "products"} on sale
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
        {/* Promotional Banner */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-red-600 to-red-800 px-6 py-8 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight">Mega Sale!</h2>
            <p className="mt-2 max-w-md text-red-100">
              Save big on select 3D printing supplies and accessories. 
              Limited time offers - while supplies last!
            </p>
          </div>
        </div>

        <ProductGrid products={products} />

        {totalPages > 1 && (
          <div className="flex justify-center">
            <nav
              className="flex gap-2"
              role="navigation"
              aria-label="Pagination"
            >
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                const isCurrent = pageNum === page;

                const searchParams = new URLSearchParams();
                if (pageNum > 1) searchParams.set("page", pageNum.toString());
                if (minDiscount) searchParams.set("minDiscount", minDiscount.toString());
                if (maxDiscount) searchParams.set("maxDiscount", maxDiscount.toString());

                return (
                  <a
                    key={pageNum}
                    href={`/deals?${searchParams.toString()}`}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-md border font-mono text-sm transition-colors ${
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/50 hover:bg-accent"
                    }`}
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

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Deals & Promotions | Save on 3D Printing Supplies",
    description: "Shop our best deals and promotions on 3D printing filaments, parts, and accessories. Save up to 50% off!",
  };
}
