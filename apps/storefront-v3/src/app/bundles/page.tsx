import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Package, ShoppingCart } from "lucide-react"
import { ListingLayout } from "@/components/layout/listing-layout"
import { ListingPagination } from "@/components/layout/listing-pagination"
import { Button } from "@/components/ui/button"
import { getProductBundles } from "@/lib/medusa/products"
import {
  getBundleLink,
  getBundleProductsById,
  getProductPath,
} from "@/lib/medusa/bundles"
import type { MedusaProduct } from "@/lib/medusa/types"
import { getBundlePricingSummary } from "@/features/product/lib/bundle-pricing"
import { formatCustomerPrice } from "@/lib/pricing/customer-pricing"
import { getPricingContext } from "@/lib/medusa/regions.server"

interface BundlesPageProps {
  searchParams: Promise<{
    page?: string
  }>
}

function getBundlePrice(product: MedusaProduct) {
  const variant = product.variants?.[0] as
    | (Record<string, unknown> & {
        calculated_price?: {
          calculated_amount?: number
        }
      })
    | undefined
  const prices = variant?.prices as Array<{ amount: number; currency_code: string }> | undefined

  return variant?.calculated_price?.calculated_amount || prices?.[0]?.amount || 0
}

function getCurrencyCode(product: MedusaProduct) {
  const variant = product.variants?.[0] as
    | (Record<string, unknown> & {
        calculated_price?: {
          currency_code?: string | null
        }
      })
    | undefined
  const prices = variant?.prices as Array<{ amount: number; currency_code: string }> | undefined

  return variant?.calculated_price?.currency_code || prices?.[0]?.currency_code || "usd"
}

function formatPrice(amount: number, currencyCode: string) {
  return formatCustomerPrice(amount, currencyCode.toUpperCase())
}

export default async function BundlesPage({ searchParams }: BundlesPageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = 12
  const pricing = await getPricingContext()

  const { products, count } = await getProductBundles({
    page,
    limit,
    ...pricing,
  })
  const bundleProductsById = await getBundleProductsById(products, pricing)

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
          <Button variant="outline" asChild>
            <Link href="/shop">
              Browse All Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-sm border border-border bg-card px-6 py-8 text-card-foreground shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.14),_transparent_42%)]" />
          <div className="absolute inset-0 opacity-30 dark:opacity-20 [background-image:linear-gradient(rgba(8,145,178,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(8,145,178,0.12)_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="relative max-w-2xl space-y-3">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-300">
              Curated Kits
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need, bundled together.
            </h2>
            <p className="text-muted-foreground">
              Save time with matched parts, accessories, and filament selected to work together. Choose a bundle, confirm your options, and add the full set to your cart.
            </p>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const bundleLink = getBundleLink(product)
              const bundleProduct = bundleLink ? bundleProductsById[bundleLink.id] : null
              const bundleItems = bundleProduct?.items ?? []
              const bundlePricing = bundleProduct
                ? getBundlePricingSummary(bundleProduct)
                : null
              const bundlePrice = bundlePricing?.bundlePrice ?? getBundlePrice(product)
              const currencyCode = bundlePricing?.currencyCode ?? getCurrencyCode(product)
              const originalTotal = bundlePricing?.compareAtPrice ?? bundlePrice
              const savings = bundlePricing?.savings ?? 0

              return (
                <article
                  key={product.id}
                  className="group relative flex flex-col overflow-hidden rounded-sm border bg-card shadow-sm transition-all hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.03)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {product.thumbnail ? (
                      <Image
                        src={product.thumbnail}
                        alt={product.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-14 w-14 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute left-4 top-4 rounded-sm border border-cyan-700/20 bg-background/95 px-3 py-1 text-xs font-mono uppercase tracking-[0.2em] text-cyan-700 shadow-sm dark:border-cyan-300/20 dark:text-cyan-300">
                      Bundle
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">
                        <Link href={getProductPath(product.handle, true)} className="hover:text-primary">
                          {product.title}
                        </Link>
                      </h3>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {product.description || "Matched products selected to work together."}
                      </p>
                    </div>

                    <div className="mt-5 space-y-3 rounded-sm border bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                          Included Items
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {bundleItems.length}
                        </p>
                      </div>
                      {bundleItems.length > 0 ? (
                        <ul className="space-y-2">
                          {bundleItems.slice(0, 3).map((item) => (
                            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                              <span className="line-clamp-1">{item.product.title}</span>
                              <span className="font-mono text-xs text-muted-foreground">
                                x{item.quantity}
                              </span>
                            </li>
                          ))}
                          {bundleItems.length > 3 ? (
                            <li className="text-xs text-muted-foreground">
                              +{bundleItems.length - 3} more included products
                            </li>
                          ) : null}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Included items will appear here once this bundle is ready.
                        </p>
                      )}
                    </div>

                    <div className="mt-auto pt-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-2xl font-bold">
                          {formatPrice(bundlePrice, currencyCode)}
                        </span>
                        {savings > 0 ? (
                          <>
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPrice(originalTotal, currencyCode)}
                            </span>
                            <span className="rounded-sm border border-cyan-700/20 bg-cyan-50 px-2 py-0.5 font-mono text-xs font-semibold text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-950/40 dark:text-cyan-200">
                              Save {formatPrice(savings, currencyCode)}
                            </span>
                          </>
                        ) : null}
                      </div>

                      <Button className="mt-4 w-full rounded-sm font-mono tracking-wider" asChild>
                        <Link href={getProductPath(product.handle, true)}>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Configure Bundle
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border bg-muted/30 py-16 text-center">
            <Package className="h-14 w-14 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">Bundles are coming soon</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              We are preparing curated kits for printers, upgrades, and everyday printing essentials. Browse the full catalogue while we finish this section.
            </p>
            <Button className="mt-6 rounded-sm font-mono" asChild>
              <Link href="/shop">
                Browse Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        <ListingPagination
          ariaLabel="Bundle pagination"
          buildHref={(pageNumber) => {
            const query = new URLSearchParams()

            if (pageNumber > 1) {
              query.set("page", String(pageNumber))
            }

            return `/bundles${query.size ? `?${query.toString()}` : ""}`
          }}
          currentPage={page}
          itemLabel="bundles"
          pageSize={limit}
          totalItems={count}
        />
      </div>
    </ListingLayout>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Product Bundles",
    description:
      "Shop curated 3D printing bundles with matched parts, accessories, and filament selected to work together.",
  }
}
