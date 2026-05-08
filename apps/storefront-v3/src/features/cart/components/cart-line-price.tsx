"use client"

import { cn } from "@/lib/utils"
import { formatCustomerPrice } from "@/lib/pricing/customer-pricing"

type CartLinePriceProps = {
  currencyCode: string
  price: number
  regularPrice?: number | null
  className?: string
}

function formatPrice(amount: number, currency: string) {
  return formatCustomerPrice(amount, currency)
}

export function CartLinePrice({
  currencyCode,
  price,
  regularPrice,
  className,
}: CartLinePriceProps) {
  const hasRegularPrice =
    typeof regularPrice === "number" && regularPrice > price

  if (!hasRegularPrice) {
    return null
  }

  return (
    <div className={cn("flex items-baseline gap-2 font-mono text-xs", className)}>
      <span className="font-semibold text-foreground">
        {formatPrice(price, currencyCode)}
      </span>
      <span className="text-muted-foreground line-through">
        {formatPrice(regularPrice, currencyCode)}
      </span>
    </div>
  )
}
