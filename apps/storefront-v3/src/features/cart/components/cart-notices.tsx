"use client"

import { AlertTriangle, Clock3, Package } from "lucide-react"
import type { MedusaCartLineItem } from "@/lib/medusa/cart"
import { toCustomerPriceAmount } from "@/lib/pricing/customer-pricing"
import { analyzeCartContents } from "@/lib/util/cart-analysis"

interface CartNoticesProps {
  items?: MedusaCartLineItem[] | null
  currencyCode: string
}

function formatAvailabilityDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

function formatMinorAmount(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(toCustomerPriceAmount(amount / 100, currencyCode))
}

export function getCompactCartNoticeLines(
  items: MedusaCartLineItem[] | null | undefined,
  currencyCode?: string
) {
  const analysis = analyzeCartContents(items, currencyCode)
  const lines: string[] = []

  if (analysis.hasPreorderItems) {
    lines.push(
      analysis.earliestPreorderDate
        ? `Pre-order items (est. ${formatAvailabilityDate(analysis.earliestPreorderDate)})`
        : "Pre-order items"
    )
  }

  if (analysis.isMixedCart) {
    lines.push("Mixed in-stock + pre-order cart")
  }

  if (analysis.bundleGroups.length > 0) {
    const bundleLabel = `${analysis.bundleGroups.length} ${analysis.bundleGroups.length === 1 ? "bundle" : "bundles"}`
    lines.push(`${bundleLabel} included`)
  }

  return lines
}

export function CartNotices({ items, currencyCode }: CartNoticesProps) {
  const analysis = analyzeCartContents(items, currencyCode)
  const shouldRender =
    analysis.hasPreorderItems ||
    analysis.isMixedCart ||
    analysis.bundleSavingsTotal > 0

  if (!shouldRender) {
    return null
  }

  return (
    <div className="space-y-3">
      {analysis.hasPreorderItems ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <div className="flex items-start gap-2">
            <Clock3 className="mt-0.5 h-4 w-4 text-primary" />
            <div className="space-y-1">
              <p className="font-medium text-primary">Pre-order items ship when available</p>
              <p className="text-muted-foreground">
                {analysis.earliestPreorderDate
                  ? `Earliest estimated availability: ${formatAvailabilityDate(analysis.earliestPreorderDate)}.`
                  : "Pre-order availability will be confirmed when inventory is released."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {analysis.isMixedCart ? (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <p>
              This cart contains both in-stock and pre-order items. In-stock items may
              ship sooner than pre-order items.
            </p>
          </div>
        </div>
      ) : null}

      {analysis.bundleSavingsTotal > 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <div className="flex items-start gap-2">
            <Package className="mt-0.5 h-4 w-4" />
            <div className="space-y-1">
              <p className="font-medium">Bundle savings applied</p>
              <p>
                {formatMinorAmount(analysis.bundleSavingsTotal, currencyCode)} saved across
                bundle items.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
