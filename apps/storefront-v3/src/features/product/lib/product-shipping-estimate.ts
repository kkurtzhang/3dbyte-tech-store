export interface ProductShippingEstimateOption {
  id: string
  name: string
  description: string
  amount: number
  currencyCode: string
  priceType: string
}

export function normalizePostcodeInput(value: string): string {
  return value.replace(/\s+/g, "").trim()
}

export function isValidAustralianPostcode(value: string): boolean {
  return /^\d{4}$/.test(normalizePostcodeInput(value))
}

export function sortShippingEstimateOptions(
  options: ProductShippingEstimateOption[]
): ProductShippingEstimateOption[] {
  return [...options].sort((left, right) => {
    if (left.amount !== right.amount) {
      return left.amount - right.amount
    }

    return left.name.localeCompare(right.name)
  })
}

export function getPrimaryShippingEstimate(
  options: ProductShippingEstimateOption[]
): ProductShippingEstimateOption | null {
  return sortShippingEstimateOptions(options)[0] ?? null
}
