import type { BundleProduct, BundleProductItem } from "@/lib/medusa/bundles"
import type {
  MedusaCurrencyAmount,
  MedusaProduct,
  MedusaProductVariant,
  MedusaProductVariantWithPreorder,
  MedusaProductVariant,
} from "@/lib/medusa/types"
import { isPreorder } from "@/lib/util/is-preorder"

const DEFAULT_VARIANT_TITLES = new Set(["default", "default title"])
const LOW_STOCK_THRESHOLD = 5

type VariantWithPricing = MedusaProductVariant & {
  calculated_price?: {
    calculated_amount?: number
    original_amount?: number
    currency_code?: string | null
  }
  prices?: Array<{
    amount?: number | null
    currency_code?: string | null
  }> | null
}

function normalizeLabel(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

export function isDefaultVariantLabel(value: string | null | undefined) {
  return DEFAULT_VARIANT_TITLES.has(normalizeLabel(value))
}

function getVariantFromProduct(
  product: MedusaProduct | null | undefined,
  variantId?: string
) {
  if (!product?.variants?.length) {
    return null
  }

  if (variantId) {
    return product.variants.find((variant) => variant.id === variantId) ?? product.variants[0]
  }

  return product.variants[0]
}

export function getVariantPriceSnapshot(
  product: MedusaProduct | null | undefined,
  variantId?: string
) {
  const variant = getVariantFromProduct(product, variantId) as VariantWithPricing | null

  const calculatedAmount = variant?.calculated_price?.calculated_amount
  const originalAmount = variant?.calculated_price?.original_amount
  const listedPrice = variant?.prices?.[0]?.amount
  const currencyCode =
    variant?.calculated_price?.currency_code ||
    variant?.prices?.find((price) => price.currency_code)?.currency_code ||
    "aud"

  return {
    amount: calculatedAmount || originalAmount || listedPrice || 0,
    originalAmount:
      originalAmount && calculatedAmount && originalAmount > calculatedAmount
        ? originalAmount
        : undefined,
    currencyCode: currencyCode.toLowerCase(),
    variant,
  }
}

export function getBundlePricingSummary(
  bundleProduct: BundleProduct,
  selectedVariantsByItemId: Record<string, string> = {}
) {
  const bundlePriceSnapshot = getVariantPriceSnapshot(bundleProduct.product)
  const baseBundlePrice = bundlePriceSnapshot.amount
  const selectedStandaloneTotal = bundleProduct.items.reduce((total, item) => {
    const selectedSnapshot = getVariantPriceSnapshot(
      item.product,
      selectedVariantsByItemId[item.id]
    )

    return total + selectedSnapshot.amount * item.quantity
  }, 0)
  const defaultStandaloneTotal = bundleProduct.items.reduce((total, item) => {
    const defaultSnapshot = getVariantPriceSnapshot(item.product)
    return total + defaultSnapshot.amount * item.quantity
  }, 0)
  const bundleDiscountAmount = Math.max(defaultStandaloneTotal - baseBundlePrice, 0)
  const bundlePrice = Math.max(selectedStandaloneTotal - bundleDiscountAmount, 0)
  const savings = Math.max(selectedStandaloneTotal - bundlePrice, 0)
  const savingsPercentage =
    selectedStandaloneTotal > 0
      ? Math.round((savings / selectedStandaloneTotal) * 100)
      : 0

  return {
    bundlePrice,
    compareAtPrice: selectedStandaloneTotal,
    defaultCompareAtPrice: defaultStandaloneTotal,
    bundleDiscountAmount,
    savings,
    savingsPercentage,
    currencyCode: bundlePriceSnapshot.currencyCode,
  }
}

export function getBundleItemPricing(
  bundleProduct: BundleProduct,
  item: BundleProductItem,
  selectedVariantsByItemId: Record<string, string> = {}
) {
  const itemSnapshot = getVariantPriceSnapshot(
    item.product,
    selectedVariantsByItemId[item.id]
  )
  const summary = getBundlePricingSummary(bundleProduct, selectedVariantsByItemId)
  const standaloneUnitPrice = itemSnapshot.amount
  const standaloneTotalPrice = standaloneUnitPrice * item.quantity

  if (summary.compareAtPrice <= 0 || summary.savings <= 0) {
    return {
      standaloneUnitPrice,
      standaloneTotalPrice,
      bundledUnitPrice: standaloneUnitPrice,
      bundledTotalPrice: standaloneTotalPrice,
      savings: 0,
      currencyCode: itemSnapshot.currencyCode,
    }
  }

  const bundleRatio = summary.bundlePrice / summary.compareAtPrice
  const bundledUnitPrice = standaloneUnitPrice * bundleRatio
  const bundledTotalPrice = bundledUnitPrice * item.quantity

  return {
    standaloneUnitPrice,
    standaloneTotalPrice,
    bundledUnitPrice,
    bundledTotalPrice,
    savings: Math.max(standaloneTotalPrice - bundledTotalPrice, 0),
    currencyCode: itemSnapshot.currencyCode,
  }
}

function getMeaningfulOptionValues(product: MedusaProduct) {
  return (product.options ?? []).map((option) => ({
    ...option,
    values: (option.values ?? []).filter((value) => !isDefaultVariantLabel(value.value)),
  }))
}

export function hasConfigurableVariantChoices(product: MedusaProduct) {
  return getMeaningfulOptionValues(product).some((option) => option.values.length > 1)
}

export function getRenderableOptions(product: MedusaProduct) {
  return getMeaningfulOptionValues(product).filter((option) => option.values.length > 1)
}

export function getSelectedVariantLabel(
  product: MedusaProduct,
  selectedVariantId?: string
) {
  const selectedVariant = getVariantFromProduct(product, selectedVariantId)

  if (!selectedVariant?.title) {
    return null
  }

  if (
    product.variants?.length === 1 &&
    !hasConfigurableVariantChoices(product) &&
    isDefaultVariantLabel(selectedVariant.title)
  ) {
    return null
  }

  return selectedVariant.title
}

type BundleInventoryStatus =
  | "in-stock"
  | "low-stock"
  | "out-of-stock"
  | "preorder"
  | "unknown"

type BundleInventorySummary = {
  status: BundleInventoryStatus
  availableQuantity: number | null
}

type InventoryAwareVariant = MedusaProductVariantWithPreorder & {
  inventory_quantity?: number | null
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
}

export function isBundleVariantPurchasable(
  variant: InventoryAwareVariant | null | undefined
) {
  if (!variant) {
    return false
  }

  if (isPreorder(variant.preorder_variant)) {
    return true
  }

  if (variant.manage_inventory === false) {
    return true
  }

  return (variant.inventory_quantity ?? 0) > 0
}

function getSelectedVariant(
  item: BundleProductItem,
  selectedVariantsByItemId: Record<string, string>
) {
  return getVariantFromProduct(
    item.product,
    selectedVariantsByItemId[item.id]
  ) as InventoryAwareVariant | null
}

function getBundlesSupportedByVariant(
  variant: InventoryAwareVariant | null,
  requiredQuantity: number
) {
  if (!variant || requiredQuantity <= 0) {
    return { status: "unknown" as const, quantity: null }
  }

  const preorder = isPreorder(variant.preorder_variant)
  const manageInventory = variant.manage_inventory ?? true
  const inventoryQuantity = variant.inventory_quantity ?? 0

  if (preorder || !manageInventory) {
    return {
      status: preorder ? ("preorder" as const) : ("in-stock" as const),
      quantity: null,
    }
  }

  const supportedQuantity = Math.floor(inventoryQuantity / requiredQuantity)

  if (supportedQuantity <= 0) {
    return {
      status: "out-of-stock" as const,
      quantity: 0,
    }
  }

  return {
    status:
      supportedQuantity < LOW_STOCK_THRESHOLD
        ? ("low-stock" as const)
        : ("in-stock" as const),
    quantity: supportedQuantity,
  }
}

export function getBundleInventorySummary(
  bundleProduct: BundleProduct,
  selectedVariantsByItemId: Record<string, string> = {}
): BundleInventorySummary {
  const itemInventory = bundleProduct.items.map((item) =>
    getBundlesSupportedByVariant(
      getSelectedVariant(item, selectedVariantsByItemId),
      item.quantity
    )
  )

  if (itemInventory.some((item) => item.status === "out-of-stock")) {
    return {
      status: "out-of-stock",
      availableQuantity: 0,
    }
  }

  const finiteQuantities = itemInventory
    .map((item) => item.quantity)
    .filter((quantity): quantity is number => quantity !== null)

  const availableQuantity =
    finiteQuantities.length > 0 ? Math.min(...finiteQuantities) : null

  if (itemInventory.some((item) => item.status === "preorder")) {
    return {
      status: "preorder",
      availableQuantity,
    }
  }

  if (availableQuantity === null) {
    return {
      status: "in-stock",
      availableQuantity: null,
    }
  }

  if (availableQuantity < LOW_STOCK_THRESHOLD) {
    return {
      status: "low-stock",
      availableQuantity,
    }
  }

  return {
    status: "in-stock",
    availableQuantity,
  }
}
