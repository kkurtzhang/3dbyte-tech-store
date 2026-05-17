"use server"

import { cookies } from "next/headers"
import { sdk } from "./client"
import {
  DEFAULT_COUNTRY_CODE,
  REGION_COUNTRY_COOKIE,
  REGION_CURRENCY_COOKIE,
  REGION_ID_COOKIE,
  findRegionById,
  getPricingContextFromRegion,
  normalizeCountryCode,
  normalizeCurrencyCode,
  selectRegionForPricing,
  type PricingContext,
  type StorefrontRegion,
} from "./regions"

const REGION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export async function listStoreRegions(): Promise<StorefrontRegion[]> {
  const { regions } = await sdk.store.region.list({
    limit: 100,
    fields: "id,name,currency_code,*countries",
  })

  return regions as StorefrontRegion[]
}

export async function getPricingContext(
  requestedCountryCode?: string
): Promise<PricingContext> {
  const cookieStore = await cookies()
  const regions = await listStoreRegions()
  const selectedRegionId = cookieStore.get(REGION_ID_COOKIE)?.value
  const cookieCountryCode = normalizeCountryCode(
    cookieStore.get(REGION_COUNTRY_COOKIE)?.value
  )
  const countryCode =
    normalizeCountryCode(requestedCountryCode) ??
    cookieCountryCode ??
    DEFAULT_COUNTRY_CODE
  const region = selectRegionForPricing({
    regions,
    selectedRegionId,
    countryCode,
    preferCountry: Boolean(normalizeCountryCode(requestedCountryCode)),
  })

  if (!region) {
    throw new Error("No Medusa region configured for Australia or New Zealand")
  }

  return getPricingContextFromRegion(region, countryCode)
}

export async function persistPricingContext(context: PricingContext) {
  const cookieStore = await cookies()
  const options = {
    path: "/",
    maxAge: REGION_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax" as const,
  }

  cookieStore.set(REGION_ID_COOKIE, context.region_id, options)
  cookieStore.set(REGION_COUNTRY_COOKIE, context.country_code, options)
  cookieStore.set(
    REGION_CURRENCY_COOKIE,
    normalizeCurrencyCode(context.currency_code) ?? context.currency_code,
    options
  )
}

export async function setSelectedRegion(regionId: string) {
  const regions = await listStoreRegions()
  const region = findRegionById(regions, regionId)

  if (!region) {
    throw new Error("Selected region was not found")
  }

  const context = getPricingContextFromRegion(region)
  await persistPricingContext(context)
  return context
}
