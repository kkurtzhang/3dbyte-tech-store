import { sdk } from "./client"
import type { MedusaOrder } from "./types"

export const ORDER_TRACKING_FIELDS = [
  "id",
  "email",
  "status",
  "payment_status",
  "fulfillment_status",
  "currency_code",
  "created_at",
  "subtotal",
  "item_subtotal",
  "shipping_total",
  "shipping_subtotal",
  "tax_total",
  "discount_total",
  "total",
  "*payment_collections.payments",
  "*items",
  "*items.metadata",
  "*items.variant",
  "*items.product",
  "*items.variant.preorder_variant",
  "*items.variant.preorder_variant.prices",
  "*shipping_methods",
  "*shipping_address",
]

export async function getOrder(id: string, fields?: string[]): Promise<MedusaOrder | null> {
  try {
    const { order } = await sdk.store.order.retrieve(id, {
      fields:
        fields?.join(",") || ORDER_TRACKING_FIELDS.join(","),
    })

    return order
  } catch (error) {
    console.warn(`Failed to fetch order: ${id}`, error)
    return null
  }
}

export async function listOrders(params: {
  limit?: number
  offset?: number
  fields?: string[]
}): Promise<{ orders: MedusaOrder[]; count: number }> {
  const { limit = 20, offset = 0, fields } = params

  const response = await sdk.store.order.list({
    limit,
    offset,
    fields: fields?.join(","),
  })

  return {
    orders: response.orders || [],
    count: response.count || 0,
  }
}
