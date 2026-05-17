"use server"

import {
  getPricingContext,
  persistPricingContext,
  setSelectedRegion,
} from "@/lib/medusa/regions.server"

export async function getPricingContextAction(countryCode?: string) {
  const context = await getPricingContext(countryCode)
  await persistPricingContext(context)
  return context
}

export async function setSelectedRegionAction(regionId: string) {
  return setSelectedRegion(regionId)
}
