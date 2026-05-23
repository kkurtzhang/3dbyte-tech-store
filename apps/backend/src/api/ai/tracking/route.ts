import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  authorizeInternalAiRequest,
  getTrimmedString,
  normalizeEmail,
  type AiRouteBody,
} from "../_utils"

type FulfillmentRecord = Record<string, unknown> & {
  id?: string
  status?: string
  data?: Record<string, unknown> | null
}

type TrackingOrder = Record<string, unknown> & {
  email?: string | null
  fulfillments?: FulfillmentRecord[] | null
}

const trackingFields = [
  "id",
  "email",
  "custom_display_id",
  "status",
  "fulfillment_status",
  "fulfillments.id",
  "fulfillments.status",
  "fulfillments.data",
]

function mapTracking(order: TrackingOrder) {
  return (order.fulfillments ?? [])
    .map((fulfillment) => {
      const data = fulfillment.data ?? {}
      const trackingNumber = getTrimmedString(data.tracking_number)

      if (!trackingNumber) return null

      return {
        fulfillmentId: fulfillment.id,
        status: fulfillment.status ?? "unknown",
        trackingNumber,
        carrierName: getTrimmedString(data.carrier_name) || "Carrier",
        trackingUrl: getTrimmedString(data.tracking_url) || null,
      }
    })
    .filter((tracking): tracking is NonNullable<typeof tracking> =>
      Boolean(tracking)
    )
}

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  if (!authorizeInternalAiRequest(req, res)) return

  const body = req.body as AiRouteBody
  const reference = getTrimmedString(body.reference)
  const email = normalizeEmail(body.email)

  if (!reference || !email) {
    res.status(400).json({
      tracking: [],
      error: "Order reference and email are required",
    })
    return
  }

  const query = req.scope.resolve("query")
  const { data } = await query.graph({
    entity: "order",
    fields: trackingFields,
    filters: { custom_display_id: reference },
  })
  const order = (data?.[0] ?? null) as TrackingOrder | null

  if (!order || order.email?.toLowerCase() !== email) {
    res.status(404).json({ tracking: [] })
    return
  }

  res.json({ tracking: mapTracking(order) })
}
