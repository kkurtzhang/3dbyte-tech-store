import { buildCartDisplayGroups } from "@/features/cart/lib/bundle-groups"
import type { BundleCartGroup } from "@/features/cart/lib/bundle-groups"
import type { MedusaCartLineItem } from "@/lib/medusa/cart"
import type { MedusaPreorderVariant } from "@/lib/medusa/types"
import { isPreorder } from "@/lib/util/is-preorder"
import { resolvePreorderPrice, resolveRegularPrice } from "@/lib/util/preorder-pricing"

type PriceLike = {
  amount: number | null
  currency_code: string | null
}

type PricingSource = {
  calculated_price?: {
    calculated_amount?: number | null
    original_amount?: number | null
    currency_code?: string | null
  } | null
  prices?: PriceLike[] | null
  preorder_variant?: {
    prices?: PriceLike[] | null
  } | null
}

type AnalyzableLineItem = {
  metadata?: unknown
  quantity?: number | null
  unit_price?: number | null
  variant?: (PricingSource & {
    preorder_variant?: MedusaPreorderVariant
  }) | null
}

export type CartAnalysis<TItem extends AnalyzableLineItem = MedusaCartLineItem> = {
  hasPreorderItems: boolean
  hasRegularItems: boolean
  isMixedCart: boolean
  preorderItems: TItem[]
  bundleGroups: BundleCartGroup<TItem>[]
  earliestPreorderDate: Date | null
  bundleSavingsTotal: number
}

function getBundleSavings<TItem extends AnalyzableLineItem>(
  item: TItem,
  currencyCode?: string
) {
  const metadata = item.metadata as Record<string, unknown> | null | undefined
  const hasBundleMetadata =
    typeof metadata?.bundle_key === "string" || typeof metadata?.bundle_id === "string"

  if (!hasBundleMetadata || typeof item.unit_price !== "number") {
    return 0
  }

  const baselinePrice = isPreorder(item.variant?.preorder_variant)
    ? resolvePreorderPrice(item.variant, currencyCode)
    : resolveRegularPrice(item.variant, currencyCode)

  if (!baselinePrice) {
    return 0
  }

  const quantity = item.quantity ?? 0
  const savingsPerUnit = baselinePrice.amount - item.unit_price

  if (savingsPerUnit <= 0 || quantity <= 0) {
    return 0
  }

  return savingsPerUnit * quantity
}

function getValidPreorderDate(preorderVariant: MedusaPreorderVariant | undefined) {
  if (!isPreorder(preorderVariant)) {
    return null
  }

  const preorderDate = preorderVariant?.available_date
    ? new Date(preorderVariant.available_date)
    : null

  return preorderDate && !Number.isNaN(preorderDate.getTime()) ? preorderDate : null
}

export function analyzeCartContents<TItem extends AnalyzableLineItem>(
  items: TItem[] | null | undefined,
  currencyCode?: string
): CartAnalysis<TItem> {
  const safeItems = items ?? []
  const preorderItems = safeItems.filter((item) => isPreorder(item.variant?.preorder_variant))
  const bundleGroups = buildCartDisplayGroups(safeItems).filter(
    (group): group is BundleCartGroup<TItem> => group.type === "bundle"
  )
  const preorderDates = preorderItems
    .map((item) => getValidPreorderDate(item.variant?.preorder_variant))
    .filter((date): date is Date => date !== null)
    .sort((left, right) => left.getTime() - right.getTime())

  return {
    hasPreorderItems: preorderItems.length > 0,
    hasRegularItems: safeItems.some((item) => !isPreorder(item.variant?.preorder_variant)),
    isMixedCart:
      preorderItems.length > 0 &&
      safeItems.some((item) => !isPreorder(item.variant?.preorder_variant)),
    preorderItems,
    bundleGroups,
    earliestPreorderDate: preorderDates[0] ?? null,
    bundleSavingsTotal: safeItems.reduce(
      (total, item) => total + getBundleSavings(item, currencyCode),
      0
    ),
  }
}
