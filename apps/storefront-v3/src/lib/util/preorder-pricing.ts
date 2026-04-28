import type { MedusaCurrencyAmount, MedusaPreorderVariant } from "@/lib/medusa/types"

type VariantPrice = {
  amount: number
  currency_code: string
}

type LooseVariantPrice = {
  amount: number | null
  currency_code: string | null
}

type PricingSourceBase = {
  calculated_price?: {
    calculated_amount?: number | null
    original_amount?: number | null
    currency_code?: string | null
  } | null
  prices?: LooseVariantPrice[] | null
  preorder_variant?: {
    prices?: MedusaCurrencyAmount[] | null
  }
}

type VariantPricingSource = PricingSourceBase & {
  preorder_variant?: MedusaPreorderVariant
}

type PreorderPricingSource = PricingSourceBase

export type PriceDisplayData = {
  price: VariantPrice
  originalPrice?: number
  discountPercentage?: number
  label?: string
}

function hasAmountAndCurrency(
  price: LooseVariantPrice | null | undefined
): price is { amount: number; currency_code: string } {
  return typeof price?.amount === "number" && typeof price?.currency_code === "string"
}

function calculateDiscountPercentage(originalPrice: number, discountedPrice: number): number | undefined {
  if (originalPrice <= 0 || discountedPrice < 0 || originalPrice <= discountedPrice) {
    return undefined
  }

  return Math.round((1 - discountedPrice / originalPrice) * 100)
}

function getCurrencyCode(source?: PricingSourceBase | null): string {
  const calculatedCurrency = source?.calculated_price?.currency_code
  if (typeof calculatedCurrency === "string" && calculatedCurrency) {
    return calculatedCurrency
  }

  const variantCurrency = source?.prices?.find(
    (price) => typeof price?.currency_code === "string" && price.currency_code
  )?.currency_code
  if (typeof variantCurrency === "string" && variantCurrency) {
    return variantCurrency
  }

  const preorderCurrency = source?.preorder_variant?.prices?.find(
    (price) => typeof price?.currency_code === "string" && price.currency_code
  )?.currency_code
  if (typeof preorderCurrency === "string" && preorderCurrency) {
    return preorderCurrency
  }

  return "usd"
}

function getReferencePrice(source?: VariantPricingSource): number | undefined {
  const originalAmount = source?.calculated_price?.original_amount
  if (typeof originalAmount === "number") {
    return originalAmount
  }

  const calculatedAmount = source?.calculated_price?.calculated_amount
  if (typeof calculatedAmount === "number") {
    return calculatedAmount
  }

  const referencePrice = source?.prices?.find(
    (price) => typeof price?.amount === "number"
  )?.amount

  return typeof referencePrice === "number" ? referencePrice : undefined
}

export function resolveRegularPrice(
  source?: PricingSourceBase | null,
  currencyCode?: string
): VariantPrice | null {
  if (!source) {
    return null
  }

  const activeCurrency = (currencyCode || getCurrencyCode(source)).toLowerCase()
  const originalAmount = source.calculated_price?.original_amount
  const calculatedAmount = source.calculated_price?.calculated_amount
  const variantPrices = source.prices?.filter(hasAmountAndCurrency) ?? []
  const matchedVariantPrice = variantPrices.find(
    (price) => price.currency_code.toLowerCase() === activeCurrency
  )
  const fallbackVariantPrice = variantPrices[0]

  if (typeof originalAmount === "number") {
    return {
      amount: originalAmount,
      currency_code: currencyCode || getCurrencyCode(source),
    }
  }

  if (
    matchedVariantPrice &&
    typeof matchedVariantPrice.amount === "number" &&
    typeof matchedVariantPrice.currency_code === "string"
  ) {
    return {
      amount: matchedVariantPrice.amount,
      currency_code: matchedVariantPrice.currency_code,
    }
  }

  if (typeof calculatedAmount === "number") {
    return {
      amount: calculatedAmount,
      currency_code: currencyCode || getCurrencyCode(source),
    }
  }

  if (
    fallbackVariantPrice &&
    typeof fallbackVariantPrice.amount === "number" &&
    typeof fallbackVariantPrice.currency_code === "string"
  ) {
    return {
      amount: fallbackVariantPrice.amount,
      currency_code: fallbackVariantPrice.currency_code,
    }
  }

  return null
}

export function getVariantPriceDisplay(
  source?: VariantPricingSource | null
): PriceDisplayData | null {
  if (!source) {
    return null
  }

  const currencyCode = getCurrencyCode(source)
  const referencePrice = getReferencePrice(source)

  if (typeof referencePrice !== "number") {
    return null
  }

  const discountedPrice = source.calculated_price?.calculated_amount
  const originalPrice = source.calculated_price?.original_amount
  const hasDiscount =
    typeof discountedPrice === "number" &&
    typeof originalPrice === "number" &&
    originalPrice > discountedPrice

  return {
    price: {
      amount: discountedPrice ?? referencePrice,
      currency_code: currencyCode,
    },
    originalPrice: hasDiscount ? originalPrice : undefined,
    discountPercentage: hasDiscount
      ? calculateDiscountPercentage(originalPrice, discountedPrice)
      : undefined,
  }
}

export function resolvePreorderPrice(
  source?: PreorderPricingSource | null,
  currencyCode?: string
): VariantPrice | null {
  const preorderPrices = source?.preorder_variant?.prices

  if (!preorderPrices || preorderPrices.length === 0) {
    return null
  }

  const activeCurrency = (currencyCode || getCurrencyCode(source)).toLowerCase()
  const matchedPrice = preorderPrices.find(
    (price) =>
      typeof price.currency_code === "string" &&
      price.currency_code.toLowerCase() === activeCurrency &&
      typeof price.amount === "number"
  )

  const fallbackPrice = preorderPrices.find(
    (price) => typeof price.amount === "number"
  )

  if (matchedPrice && typeof matchedPrice.amount === "number" && typeof matchedPrice.currency_code === "string") {
    return {
      amount: matchedPrice.amount,
      currency_code: matchedPrice.currency_code,
    }
  }

  if (fallbackPrice && typeof fallbackPrice.amount === "number" && typeof fallbackPrice.currency_code === "string") {
    return {
      amount: fallbackPrice.amount,
      currency_code: fallbackPrice.currency_code,
    }
  }

  return null
}
