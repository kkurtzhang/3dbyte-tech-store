import { resolveRegularPrice } from "@/lib/util/preorder-pricing"

type CartLinePricingSource = {
  metadata?: unknown
  unit_price?: number | null
  variant?: Parameters<typeof resolveRegularPrice>[0]
}

function getMetadataNumber(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object") {
    return null
  }

  const value = (metadata as Record<string, unknown>)[key]
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function resolveCartLineRegularUnitPrice(
  item: CartLinePricingSource,
  currencyCode: string
) {
  const variantRegularPrice = resolveRegularPrice(item.variant, currencyCode)
  if (
    typeof variantRegularPrice?.amount === "number" &&
    typeof item.unit_price === "number" &&
    variantRegularPrice.amount > item.unit_price
  ) {
    return variantRegularPrice.amount
  }

  return (
    getMetadataNumber(item.metadata, "bundle_regular_unit_price") ??
    getMetadataNumber(item.metadata, "regular_unit_price") ??
    getMetadataNumber(item.metadata, "compare_at_unit_price")
  )
}
