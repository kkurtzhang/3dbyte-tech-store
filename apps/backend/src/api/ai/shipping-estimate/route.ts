import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { KARRIO_MODULE } from "../../../modules/karrio"
import type KarrioModuleService from "../../../modules/karrio/service"
import {
  buildParcelsFromItems,
  buildRecipientAddress,
  buildShipperAddress,
} from "../../../modules/karrio/utils"
import {
  authorizeInternalAiRequest,
  getTrimmedString,
  type AiRouteBody,
} from "../_utils"

type EstimateItem = {
  variantId: string
  quantity: number
}

type VariantRecord = {
  id: string
  weight?: number | null
}

function getEstimateItems(value: unknown): EstimateItem[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      const itemRecord = item as Record<string, unknown>
      const variantId = getTrimmedString(itemRecord.variantId)
      const quantity =
        typeof itemRecord.quantity === "number" &&
        Number.isInteger(itemRecord.quantity) &&
        itemRecord.quantity > 0
          ? itemRecord.quantity
          : 1

      return variantId ? { variantId, quantity } : null
    })
    .filter((item): item is EstimateItem => Boolean(item))
}

function getDestination(value: unknown) {
  const destination = (value ?? {}) as Record<string, unknown>

  return {
    city: getTrimmedString(destination.city),
    postal_code:
      getTrimmedString(destination.postalCode) ||
      getTrimmedString(destination.postal_code),
    country_code:
      getTrimmedString(destination.countryCode) ||
      getTrimmedString(destination.country_code),
    province: getTrimmedString(destination.province),
  }
}

function hasRequiredDestination(destination: ReturnType<typeof getDestination>) {
  return Boolean(
    destination.city && destination.postal_code && destination.country_code
  )
}

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  if (!authorizeInternalAiRequest(req, res)) return

  const body = req.body as AiRouteBody
  const items = getEstimateItems(body.items)
  const destination = getDestination(body.destination)

  if (!items.length) {
    res.status(400).json({
      rates: [],
      error: "At least one product variant is required for shipping estimates",
    })
    return
  }

  if (!hasRequiredDestination(destination)) {
    res.status(400).json({
      rates: [],
      error: "City, postal code, and country are required for shipping estimates",
    })
    return
  }

  const query = req.scope.resolve("query")
  const karrioService = req.scope.resolve<KarrioModuleService>(KARRIO_MODULE)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "weight"],
    filters: { id: items.map((item) => item.variantId) },
  })
  const variants = new Map(
    ((data ?? []) as VariantRecord[]).map((variant) => [variant.id, variant])
  )
  const parcelItems = items.map((item) => ({
    quantity: item.quantity,
    variant: {
      weight: variants.get(item.variantId)?.weight ?? 0.25,
    },
  }))
  const rateResponse = await karrioService.fetchRates({
    shipper: buildShipperAddress(),
    recipient: buildRecipientAddress(destination),
    parcels: buildParcelsFromItems(parcelItems),
  })
  const rates = rateResponse.rates.map((rate) => ({
    id: rate.id,
    carrierName: rate.carrier_name,
    service: rate.service,
    totalCharge: Math.round(rate.total_charge * 100),
    currency: rate.currency,
    transitDays: rate.transit_days,
    estimatedDelivery: rate.estimated_delivery,
  }))

  res.json({ rates })
}
