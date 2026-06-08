import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Package, ShoppingCart } from "lucide-react"
import { ListingLayout } from "@/components/layout/listing-layout"
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
  const totalPages = Math.ceil(count / limit)

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
        <div className="relative overflow-hidden rounded-sm border border-cyan-500/10 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.08),_transparent_42%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(30,41,59,0.94))] px-6 py-8 text-white shadow-[0_0_15px_rgba(6,182,212,0.02)]">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="relative max-w-2xl space-y-3">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-cyan-400">
              Real Bundle Inventory
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              Medusa-backed bundles with per-item variant selection.
            </h2>
            <p className="text-primary-foreground/80">
              Each bundle is linked to a real Medusa product, priced as a bundle, and expanded into grouped cart items at checkout.
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
                    <div className="absolute left-4 top-4 rounded-sm bg-background/95 px-3 py-1 text-xs font-mono uppercase tracking-[0.2em] text-cyan-500 border border-cyan-500/10 shadow-sm">
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
                        {product.description || "Bundle together multiple products with a single grouped add-to-cart flow."}
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
                          Bundle details will appear once the backend route returns the linked bundle items.
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
                            <span className="rounded-sm bg-cyan-950/30 border border-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-400 font-mono">
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
          <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-cyan-500/20 bg-slate-900/5 py-16 text-center">
            <Package className="h-14 w-14 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">No bundles available yet</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Create a bundled product in the backend and it will surface here automatically once its linked Medusa product is published.
            </p>
            <Button className="mt-6 rounded-sm font-mono" asChild>
              <Link href="/shop">
                Browse Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex justify-center">
            <nav className="flex gap-2" aria-label="Bundle pagination">
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1
                const isCurrent = pageNumber === page
                const query = new URLSearchParams()

                if (pageNumber > 1) {
                  query.set("page", String(pageNumber))
                }

                return (
                  <Link
                    key={pageNumber}
                    href={`/bundles${query.size ? `?${query.toString()}` : ""}`}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-sm border font-mono text-sm transition-colors ${
                      isCurrent
                        ? "border-cyan-500 bg-cyan-500 text-slate-950 font-bold"
                        : "hover:border-cyan-500/50 hover:text-cyan-500"
                    }`}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {pageNumber}
                  </Link>
                )
              })}
            </nav>
          </div>
        ) : null}
      </div>
    </ListingLayout>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Product Bundles",
    description:
      "Browse Medusa-backed product bundles with grouped cart handling and per-item variant selection.",
  }
}
