export const REGION_ID_COOKIE = "_medusa_region_id"
export const REGION_COUNTRY_COOKIE = "_medusa_country_code"
export const REGION_CURRENCY_COOKIE = "_medusa_currency_code"

export const DEFAULT_COUNTRY_CODE = "au"
export const DEFAULT_CURRENCY_CODE = "aud"
export const SUPPORTED_LAUNCH_COUNTRY_CODES = ["au", "nz"] as const

export type LaunchCountryCode = (typeof SUPPORTED_LAUNCH_COUNTRY_CODES)[number]

export type RegionCountry = {
  iso_2?: string | null
}

export type StorefrontRegion = {
  id: string
  name?: string | null
  currency_code: string
  countries?: RegionCountry[] | null
}

export type PricingContext = {
  region_id: string
  country_code: string
  currency_code: string
}

function normalizeCode(value: string | null | undefined) {
  return value?.trim().toLowerCase() || undefined
}

export function normalizeCountryCode(value: string | null | undefined) {
  const normalized = normalizeCode(value)
  return normalized?.length === 2 ? normalized : undefined
}

export function normalizeCurrencyCode(value: string | null | undefined) {
  const normalized = normalizeCode(value)
  return normalized?.length === 3 ? normalized : undefined
}

export function isSupportedLaunchCountry(
  value: string | null | undefined
): value is LaunchCountryCode {
  return SUPPORTED_LAUNCH_COUNTRY_CODES.includes(
    normalizeCountryCode(value) as LaunchCountryCode
  )
}

export function regionSupportsCountry(
  region: StorefrontRegion,
  countryCode: string | null | undefined
) {
  const normalizedCountry = normalizeCountryCode(countryCode)
  if (!normalizedCountry) {
    return false
  }

  return Boolean(
    region.countries?.some(
      (country) => normalizeCountryCode(country.iso_2) === normalizedCountry
    )
  )
}

export function getDefaultCountryForRegion(
  region: StorefrontRegion,
  fallbackCountryCode = DEFAULT_COUNTRY_CODE
) {
  const fallback = normalizeCountryCode(fallbackCountryCode) ?? DEFAULT_COUNTRY_CODE
  const supportedCountry = region.countries
    ?.map((country) => normalizeCountryCode(country.iso_2))
    .find((country): country is LaunchCountryCode =>
      isSupportedLaunchCountry(country)
    )

  return supportedCountry ?? fallback
}

export function findRegionByCountry(
  regions: StorefrontRegion[],
  countryCode: string | null | undefined = DEFAULT_COUNTRY_CODE
) {
  const normalizedCountry = normalizeCountryCode(countryCode) ?? DEFAULT_COUNTRY_CODE
  return regions.find((region) => regionSupportsCountry(region, normalizedCountry))
}

export function findRegionById(
  regions: StorefrontRegion[],
  regionId: string | null | undefined
) {
  const normalizedRegionId = regionId?.trim()
  if (!normalizedRegionId) {
    return undefined
  }

  return regions.find((region) => region.id === normalizedRegionId)
}

export function selectRegionForPricing({
  regions,
  selectedRegionId,
  countryCode = DEFAULT_COUNTRY_CODE,
  preferCountry = false,
}: {
  regions: StorefrontRegion[]
  selectedRegionId?: string | null
  countryCode?: string | null
  preferCountry?: boolean
}) {
  const countryRegion = findRegionByCountry(regions, countryCode)

  if (preferCountry && countryRegion) {
    return countryRegion
  }

  return (
    findRegionById(regions, selectedRegionId) ??
    countryRegion ??
    findRegionByCountry(regions, DEFAULT_COUNTRY_CODE) ??
    regions[0]
  )
}

export function getPricingContextFromRegion(
  region: StorefrontRegion,
  countryCode?: string | null
): PricingContext {
  const normalizedCountry = normalizeCountryCode(countryCode)
  const resolvedCountry =
    normalizedCountry && regionSupportsCountry(region, normalizedCountry)
      ? normalizedCountry
      : getDefaultCountryForRegion(region, normalizedCountry)

  return {
    region_id: region.id,
    country_code: resolvedCountry,
    currency_code:
      normalizeCurrencyCode(region.currency_code) ?? DEFAULT_CURRENCY_CODE,
  }
}

export function parseRegionCookieHeader(cookieHeader: string | null | undefined) {
  const values = new Map<string, string>()

  cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [key, ...valueParts] = part.split("=")
      if (key && valueParts.length > 0) {
        values.set(key, decodeURIComponent(valueParts.join("=")))
      }
    })

  const regionId = values.get(REGION_ID_COOKIE)?.trim()
  const countryCode = normalizeCountryCode(values.get(REGION_COUNTRY_COOKIE))
  const currencyCode = normalizeCurrencyCode(values.get(REGION_CURRENCY_COOKIE))

  return {
    ...(regionId ? { region_id: regionId } : {}),
    ...(countryCode ? { country_code: countryCode } : {}),
    ...(currencyCode ? { currency_code: currencyCode } : {}),
  }
}

export function getClientPricingContext() {
  if (typeof document === "undefined") {
    return {}
  }

  return parseRegionCookieHeader(document.cookie)
}
