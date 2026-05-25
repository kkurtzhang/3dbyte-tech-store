import type {
  MeilisearchAddressDocument,
  MeilisearchLocalityDocument,
} from "@3dbyte-tech-store/shared-types"

export interface ProductShippingEstimateOption {
  id: string
  name: string
  description: string
  amount: number
  currencyCode: string
  priceType: string
}

export interface ProductShippingLocalitySuggestion {
  id: string
  label: string
  suburb: string
  state: string
  postcode: string
  country: string
}

export function normalizePostcodeInput(value: string): string {
  return value.replace(/\s+/g, "").trim()
}

export function normalizeLocalityInput(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

export function minorUnitAmountToMajorUnitAmount(
  amount: number,
  currencyCode: string
): number {
  const zeroDecimalCurrencies = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"])
  const normalizedCurrency = currencyCode.trim().toLowerCase()

  if (zeroDecimalCurrencies.has(normalizedCurrency)) {
    return amount
  }

  return amount / 100
}

export function parseShippingDestinationInput(value: string): {
  postalCode: string
  locality: string
} {
  const normalizedValue = normalizeLocalityInput(value)
  const postalCode = normalizedValue.match(/\b\d{4}\b/)?.[0] ?? ""
  const locality = normalizeLocalityInput(
    normalizedValue
      .replace(/\b\d{4}\b/g, " ")
      .replace(/\b(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\b/gi, " ")
  )

  return {
    postalCode,
    locality,
  }
}

export function isValidAustralianPostcode(value: string): boolean {
  return /^\d{4}$/.test(normalizePostcodeInput(value))
}

export function inferAustralianStateFromPostcode(
  value: string
): string | undefined {
  const postcode = normalizePostcodeInput(value)

  if (!isValidAustralianPostcode(postcode)) {
    return undefined
  }

  const numericPostcode = Number.parseInt(postcode, 10)

  if (
    (numericPostcode >= 200 && numericPostcode <= 299) ||
    (numericPostcode >= 2600 && numericPostcode <= 2618) ||
    (numericPostcode >= 2900 && numericPostcode <= 2920)
  ) {
    return "ACT"
  }

  if (
    (numericPostcode >= 800 && numericPostcode <= 899) ||
    (numericPostcode >= 900 && numericPostcode <= 999)
  ) {
    return "NT"
  }

  if (
    (numericPostcode >= 1000 && numericPostcode <= 1999) ||
    (numericPostcode >= 2000 && numericPostcode <= 2599) ||
    (numericPostcode >= 2619 && numericPostcode <= 2899) ||
    (numericPostcode >= 2921 && numericPostcode <= 2999)
  ) {
    return "NSW"
  }

  if (
    (numericPostcode >= 3000 && numericPostcode <= 3999) ||
    (numericPostcode >= 8000 && numericPostcode <= 8999)
  ) {
    return "VIC"
  }

  if (
    (numericPostcode >= 4000 && numericPostcode <= 4999) ||
    (numericPostcode >= 9000 && numericPostcode <= 9999)
  ) {
    return "QLD"
  }

  if (numericPostcode >= 5000 && numericPostcode <= 5999) {
    return "SA"
  }

  if (numericPostcode >= 6000 && numericPostcode <= 6999) {
    return "WA"
  }

  if (numericPostcode >= 7000 && numericPostcode <= 7999) {
    return "TAS"
  }

  return undefined
}

export function getLocalitySuggestionsFromAddresses(
  addresses: MeilisearchAddressDocument[],
  postcode?: string
): ProductShippingLocalitySuggestion[] {
  const normalizedPostcode = postcode ? normalizePostcodeInput(postcode) : ""
  const suggestions = new Map<string, ProductShippingLocalitySuggestion>()

  for (const address of addresses) {
    const suburb = normalizeLocalityInput(address.suburb)
    const state = address.state.trim().toUpperCase()
    const addressPostcode = normalizePostcodeInput(address.postcode)
    const country = address.country.trim().toUpperCase()

    if (!suburb || !state || !addressPostcode || !country) {
      continue
    }

    if (normalizedPostcode && addressPostcode !== normalizedPostcode) {
      continue
    }

    const key = `${suburb.toLowerCase()}|${state}|${addressPostcode}|${country}`

    if (!suggestions.has(key)) {
      suggestions.set(key, {
        id: key,
        label: `${suburb} ${state} ${addressPostcode}`,
        suburb,
        state,
        postcode: addressPostcode,
        country,
      })
    }
  }

  return Array.from(suggestions.values()).slice(0, 6)
}

export function getLocalitySuggestionsFromLocalities(
  localities: MeilisearchLocalityDocument[],
  postcode?: string
): ProductShippingLocalitySuggestion[] {
  const normalizedPostcode = postcode ? normalizePostcodeInput(postcode) : ""
  const suggestions = new Map<string, ProductShippingLocalitySuggestion>()

  for (const localityDocument of localities) {
    const suburb = normalizeLocalityInput(localityDocument.locality)
    const state = localityDocument.state.trim().toUpperCase()
    const localityPostcode = normalizePostcodeInput(localityDocument.postcode)
    const country = localityDocument.country.trim().toUpperCase()

    if (!suburb || !state || !localityPostcode || !country) {
      continue
    }

    if (normalizedPostcode && localityPostcode !== normalizedPostcode) {
      continue
    }

    const key = `${suburb.toLowerCase()}|${state}|${localityPostcode}|${country}`

    if (!suggestions.has(key)) {
      suggestions.set(key, {
        id: localityDocument.id || key,
        label: `${suburb} ${state} ${localityPostcode}`,
        suburb,
        state,
        postcode: localityPostcode,
        country,
      })
    }
  }

  return Array.from(suggestions.values()).slice(0, 6)
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
