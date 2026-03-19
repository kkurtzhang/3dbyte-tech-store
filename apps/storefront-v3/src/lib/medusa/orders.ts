import { sdk } from "./client"
import type { MedusaOrder } from "./types"

export async function getOrder(id: string, fields?: string[]): Promise<MedusaOrder | null> {
  try {
    const { order } = await sdk.store.order.retrieve(id, {
      fields: fields?.join(","),
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
