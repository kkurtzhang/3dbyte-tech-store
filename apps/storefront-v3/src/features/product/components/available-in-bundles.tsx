"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { getProductPath, type BundleProduct } from "@/lib/medusa/bundles"
import type { MedusaProduct, MedusaProductVariant } from "@/lib/medusa/types"
import { getBundlePricingSummary } from "@/features/product/lib/bundle-pricing"

interface AvailableInBundlesProps {
  bundles: BundleProduct[]
  product: MedusaProduct
  selectedVariant?: MedusaProductVariant
}

function formatMoney(amount: number, currencyCode = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currencyCode,
  }).format(amount)
}

function buildSelectedVariantsByItemId(
  bundle: BundleProduct,
  productId: string,
  selectedVariantId?: string
) {
  if (!selectedVariantId) {
    return {}
  }

  return Object.fromEntries(
    bundle.items
      .filter((item) => item.product.id === productId)
      .map((item) => [item.id, selectedVariantId])
  )
}

function getAdditionalItems(bundle: BundleProduct, currentProductId: string) {
  return bundle.items.filter((item) => item.product.id !== currentProductId)
}

export function AvailableInBundles({
  bundles,
  product,
  selectedVariant,
}: AvailableInBundlesProps) {
  if (bundles.length === 0) {
    return null
  }

  const currentVariantId = selectedVariant?.id ?? product.variants?.[0]?.id

  const sortedBundles = [...bundles].sort((left, right) => {
    const leftSavings = getBundlePricingSummary(
      left,
      buildSelectedVariantsByItemId(left, product.id, currentVariantId)
    ).savings
    const rightSavings = getBundlePricingSummary(
      right,
      buildSelectedVariantsByItemId(right, product.id, currentVariantId)
    ).savings

    if (rightSavings !== leftSavings) {
      return rightSavings - leftSavings
    }

    return (left.product?.title || left.title).localeCompare(
      right.product?.title || right.title
    )
  })

  return (
    <div className="rounded-lg border bg-secondary/10 p-4">
      <div className="mb-4">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">
          Bundle Discovery
        </p>
        <h2 className="mt-1 text-lg font-semibold">Available in Bundles</h2>
        <p className="text-sm text-muted-foreground">
          This product is also offered inside curated bundle configurations.
        </p>
      </div>

      <div className="space-y-3">
        {sortedBundles.map((bundle) => {
          const bundleHandle = bundle.product?.handle
          const bundleTitle = bundle.product?.title || bundle.title
          const selectedVariantsByItemId = buildSelectedVariantsByItemId(
            bundle,
            product.id,
            currentVariantId
          )
          const { bundlePrice, compareAtPrice, savings, savingsPercentage, currencyCode } =
            getBundlePricingSummary(bundle, selectedVariantsByItemId)
          const additionalItems = getAdditionalItems(bundle, product.id).slice(0, 3)

          return (
            <div key={bundle.id} className="rounded-xl border bg-background p-4">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_220px] lg:items-start">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-start gap-2">
                    {bundleHandle ? (
                      <Link
                        href={getProductPath(bundleHandle, true)}
                        className="min-w-0 text-base font-semibold leading-snug hover:text-primary"
                      >
                        {bundleTitle}
                      </Link>
                    ) : (
                      <p className="text-base font-semibold leading-snug">{bundleTitle}</p>
                    )}
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px] uppercase tracking-wider"
                    >
                      {bundle.items.length} item{bundle.items.length === 1 ? "" : "s"}
                    </Badge>
                    {savingsPercentage > 0 ? (
                      <Badge className="font-mono text-[10px] uppercase tracking-wider">
                        Save {savingsPercentage}%
                      </Badge>
                    ) : null}
                  </div>

                  {additionalItems.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                        Also includes
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-foreground/90">
                        {additionalItems.map((item, index) => (
                          <span key={item.id} className="inline-flex min-w-0 items-center gap-1">
                            <span>{item.quantity} x</span>
                            {item.product.handle ? (
                              <Link
                                href={getProductPath(item.product.handle)}
                                className="min-w-0 truncate hover:text-primary hover:underline"
                              >
                                {item.product.title}
                              </Link>
                            ) : (
                              <span className="min-w-0 truncate">{item.product.title}</span>
                            )}
                            {index < additionalItems.length - 1 ? <span>,</span> : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border bg-secondary/20 px-4 py-3 lg:text-right">
                  <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                    From
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {formatMoney(bundlePrice, currencyCode)}
                  </p>
                  {savings > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground line-through">
                        {formatMoney(compareAtPrice, currencyCode)}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
