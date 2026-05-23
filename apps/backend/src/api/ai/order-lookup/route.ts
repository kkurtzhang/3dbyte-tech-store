import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  authorizeInternalAiRequest,
  getTrimmedString,
  normalizeEmail,
  type AiRouteBody,
} from "../_utils"

type AiOrder = Record<string, unknown> & {
  email?: string | null
}

export const aiOrderLookupFields = [
  "id",
  "email",
  "display_id",
  "custom_display_id",
  "status",
  "payment_status",
  "fulfillment_status",
  "currency_code",
  "created_at",
  "total",
  "items.title",
  "items.quantity",
  "shipping_methods.name",
]

function toSafeOrder(order: AiOrder) {
  return {
    id: order.id,
    display_id: order.display_id,
    custom_display_id: order.custom_display_id,
    status: order.status,
    payment_status: order.payment_status,
    fulfillment_status: order.fulfillment_status,
    currency_code: order.currency_code,
    created_at: order.created_at,
    total: order.total,
    items: order.items ?? [],
    shipping_methods: order.shipping_methods ?? [],
  }
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
      order: null,
      error: "Order reference and email are required",
    })
    return
  }

  const query = req.scope.resolve("query")
  const { data } = await query.graph({
    entity: "order",
    fields: aiOrderLookupFields,
    filters: { custom_display_id: reference },
  })
  const order = (data?.[0] ?? null) as AiOrder | null

  if (!order || order.email?.toLowerCase() !== email) {
    res.status(404).json({ order: null })
    return
  }

  res.json({ order: toSafeOrder(order) })
}
