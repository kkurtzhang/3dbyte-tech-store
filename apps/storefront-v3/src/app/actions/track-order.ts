"use server"

import { sdk } from "@/lib/medusa/client"
import { StoreOrder } from "@medusajs/types"

interface OrderLookupResult {
  success: boolean
  order?: StoreOrder
  error?: string
}

export async function lookupOrder(
  orderId: string,
  email: string
): Promise<OrderLookupResult> {
  try {
    // Clean up the inputs
    const cleanOrderId = orderId.trim()
    const cleanEmail = email.trim().toLowerCase()

    // Retrieve the order
    const { order } = await sdk.store.order.retrieve(cleanOrderId)

    if (!order) {
      return {
        success: false,
        error: "Order not found. Please check your order ID and try again.",
      }
    }

    // Verify email matches
    // The order might have email in different fields depending on Medusa version
    const orderEmail = (order.email || "").toLowerCase()
    
    if (orderEmail !== cleanEmail) {
      return {
        success: false,
        error: "The email address doesn't match our records for this order. Please check and try again.",
      }
    }

    return {
      success: true,
      order: order as StoreOrder,
    }
  } catch (error: any) {
    console.error("Order lookup failed:", error)
    
    // Check if it's a 404 (order not found)
    if (error?.status === 404 || error?.response?.status === 404) {
      return {
        success: false,
        error: "Order not found. Please check your order ID and try again.",
      }
    }

    return {
      success: false,
      error: "Unable to look up your order. Please try again later.",
    }
  }
}
