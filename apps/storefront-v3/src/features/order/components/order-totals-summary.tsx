"use client"

import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type OrderTotalsSummaryProps = {
  currencyCode: string
  discountTotal?: number
  shippingLabel?: string
  shippingTotal?: number | null
  subtotal: number
  taxTotal?: number | null
  total: number
  className?: string
}

function formatPrice(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount)
}

function normalizeCurrencyCode(currencyCode: string) {
  return currencyCode.toUpperCase()
}

export function OrderTotalsSummary({
  className,
  currencyCode,
  discountTotal = 0,
  shippingLabel = "Calculated next",
  shippingTotal,
  subtotal,
  taxTotal = 0,
  total,
}: OrderTotalsSummaryProps) {
  const displayCurrency = normalizeCurrencyCode(currencyCode)
  const hasShippingTotal = typeof shippingTotal === "number"
  const hasDiscount = discountTotal > 0

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-mono">{formatPrice(subtotal, displayCurrency)}</span>
        </div>

        {hasDiscount ? (
          <div className="flex items-center justify-between gap-4 text-primary">
            <span>Discount</span>
            <span className="font-mono">
              -{formatPrice(discountTotal, displayCurrency)}
            </span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Shipping</span>
          <span
            className={cn(
              "font-mono",
              !hasShippingTotal && "text-muted-foreground"
            )}
          >
            {hasShippingTotal
              ? formatPrice(shippingTotal, displayCurrency)
              : shippingLabel}
          </span>
        </div>
      </div>

      <Separator />

      <div className="flex items-start justify-between gap-4">
        <span className="font-semibold">Total ({displayCurrency})</span>
        <div className="text-right">
          <p className="font-mono text-lg font-semibold text-primary">
            {formatPrice(total, displayCurrency)}
          </p>
          <p className="text-xs text-muted-foreground">
            (Includes GST: {formatPrice(taxTotal ?? 0, displayCurrency)})
          </p>
        </div>
      </div>
    </div>
  )
}
