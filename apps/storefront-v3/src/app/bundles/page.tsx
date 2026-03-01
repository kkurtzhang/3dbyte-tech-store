import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getProductBundles } from "@/lib/medusa/products";
import { ListingLayout } from "@/components/layout/listing-layout";
import { Button } from "@/components/ui/button";
import { Package, ArrowRight, ShoppingCart } from "lucide-react";

interface BundlesPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

// Bundle item type for displaying items included in a bundle
interface BundleItem {
  id: string;
  title: string;
  thumbnail?: string;
  price?: number;
}

// Helper to extract bundle items from product metadata
function getBundleItems(product: any): BundleItem[] {
  const metadata = product.metadata as Record<string, unknown> | null;
  const bundleItems = metadata?.bundle_items as string[] | undefined;
  
  if (bundleItems && Array.isArray(bundleItems)) {
    // Map bundle item IDs to demo products (in real app, would fetch actual products)
    const demoProducts: Record<string, BundleItem> = {
      "demo-1": { id: "demo-1", title: "PLA Filament - Arctic White", price: 24.99 },
      "demo-2": { id: "demo-2", title: "Voron 2.4 Kit - Complete", price: 1299.00 },
      "demo-3": { id: "demo-3", title: "LDO Motor Set - NEMA17", price: 159.00 },
      "demo-4": { id: "demo-4", title: "PETG Filament - Deep Blue", price: 27.99 },
    };
    
    return bundleItems
      .map((id) => demoProducts[id])
      .filter(Boolean);
  }
  
  // Return default items based on bundle for demo
  return [];
}

// Format price from cents to dollars
function formatPrice(amount: number | undefined, currencyCode: string = "usd"): string {
  if (amount === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(amount / 100);
}

// Extract price from product variants
function getPrice(product: any): number | undefined {
  const variant = product.variants?.[0];
  if (!variant) return undefined;
  
  // Try calculated_price first (with discounts applied)
  if (variant.calculated_price?.calculated_amount !== undefined) {
    return variant.calculated_price.calculated_amount;
  }
  
  // Fall back to regular price
  const price = variant.prices?.find((p: any) => p.currency_code === "usd");
  return price?.amount;
}

export default async function BundlesPage({ searchParams }: BundlesPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = 12;

  const { products, count } = await getProductBundles({
    page,
    limit,
  });

  const totalPages = Math.ceil(count / limit);

  return (
    <ListingLayout
      header={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Product Bundles</h1>
              <p className="font-mono text-sm text-muted-foreground">
                {count} {count === 1 ? "bundle" : "bundles"} available
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/shop">
                Browse All Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Promotional Banner */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary to-primary/80 px-6 py-8 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight">Save More with Bundles!</h2>
            <p className="mt-2 max-w-md text-primary-foreground/90">
              Get the best value by purchasing products together. 
              Our curated bundles include everything you need at discounted prices.
            </p>
          </div>
        </div>

        {/* Bundle Grid */}
        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product: any) => {
              const price = getPrice(product);
              const bundleItems = getBundleItems(product);
              const originalTotal = bundleItems.reduce((sum, item) => sum + (item.price || 0), 0);
              const savings = originalTotal > 0 && price ? originalTotal - (price / 100) : 0;

              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:shadow-lg"
                >
                  {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {product.thumbnail ? (
                      <Image
                        src={product.thumbnail}
                        alt={product.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Bundle Badge */}
                    <div className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Bundle
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-1 text-lg font-semibold">
                      <Link
                        href={`/products/${product.handle}`}
                        className="hover:text-primary"
                      >
                        {product.title}
                      </Link>
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {product.description}
                    </p>

                    {/* Items Included */}
                    {bundleItems.length > 0 && (
                      <div className="mt-4">
                        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Includes:
                        </h4>
                        <ul className="space-y-1">
                          {bundleItems.slice(0, 3).map((item, idx) => (
                            <li
                              key={idx}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                                {idx + 1}
                              </span>
                              <span className="line-clamp-1">{item.title}</span>
                            </li>
                          ))}
                          {bundleItems.length > 3 && (
                            <li className="text-sm text-muted-foreground">
                              +{bundleItems.length - 3} more items
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Price & Savings */}
                    <div className="mt-auto pt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold">
                          {formatPrice(price)}
                        </span>
                        {savings > 0 && (
                          <>
                            <span className="text-sm text-muted-foreground line-through">
                              ${originalTotal.toFixed(2)}
                            </span>
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Save ${savings.toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Add to Cart Button */}
                      <Button className="mt-3 w-full" asChild>
                        <Link href={`/products/${product.handle}`}>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          View Bundle
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-16 w-16 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">No bundles available</h3>
            <p className="mt-2 text-muted-foreground">
              Check back soon for our curated product bundles!
            </p>
            <Button className="mt-4" asChild>
              <Link href="/shop">
                Browse Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {/* Pagination */}
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

                return (
                  <a
                    key={pageNum}
                    href={`/bundles?${searchParams.toString()}`}
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
    title: "Product Bundles | Save on 3D Printing Supplies",
    description: "Shop our curated product bundles for 3D printing. Get everything you need at discounted prices.",
  };
}
