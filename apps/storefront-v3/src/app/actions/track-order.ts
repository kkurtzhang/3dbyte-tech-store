"use server"

import { sdk } from "@/lib/medusa/client"
import { ORDER_TRACKING_FIELDS } from "@/lib/medusa/orders"
import type { MedusaOrder } from "@/lib/medusa/types"

interface OrderLookupResult {
  success: boolean
  order?: MedusaOrder
  error?: string
}

type TrackingPaymentMethod = {
  type: "card"
  brand: string
  last4: string
}

function getMedusaBackendUrl() {
  return process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
}

function isTrackingPaymentMethod(value: unknown): value is TrackingPaymentMethod {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const paymentMethod = value as Record<string, unknown>

  return (
    paymentMethod.type === "card" &&
    typeof paymentMethod.brand === "string" &&
    typeof paymentMethod.last4 === "string"
  )
}

async function getTrackingPaymentMethod(orderId: string, email: string) {
  try {
    const paymentMethodUrl = new URL(
      `/store/orders/${orderId}/payment-method`,
      getMedusaBackendUrl()
    )
    paymentMethodUrl.searchParams.set("email", email)

    const response = await fetch(paymentMethodUrl, {
      headers: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
        ? {
            "x-publishable-api-key":
              process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
          }
        : undefined,
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as { payment_method?: unknown }

    return isTrackingPaymentMethod(data.payment_method)
      ? data.payment_method
      : null
  } catch {
    return null
  }
}

async function lookupOrderByCustomerReference(reference: string, email: string) {
  const lookupUrl = new URL("/store/orders/lookup", getMedusaBackendUrl())
  lookupUrl.searchParams.set("reference", reference)
  lookupUrl.searchParams.set("email", email)

  const response = await fetch(lookupUrl, {
    headers: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
      ? {
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
        }
      : undefined,
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as { order?: MedusaOrder | null }

  return data.order || null
}

export async function lookupOrder(
  orderId: string,
  email: string
): Promise<OrderLookupResult> {
  try {
    // Clean up the inputs
    const cleanOrderId = orderId.trim()
    const cleanEmail = email.trim().toLowerCase()

    const order = cleanOrderId.startsWith("order_")
      ? (
          await sdk.store.order.retrieve(cleanOrderId, {
            fields: ORDER_TRACKING_FIELDS.join(","),
          })
        ).order
      : await lookupOrderByCustomerReference(cleanOrderId, cleanEmail)

    if (!order) {
      return {
        success: false,
        error: "Order not found. Please check your order number or reference and try again.",
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
      order: {
        ...order,
        tracking_payment_method: await getTrackingPaymentMethod(
          order.id,
          cleanEmail
        ),
      } as MedusaOrder,
    }
  } catch (error: any) {
    console.error("Order lookup failed:", error)
    
    // Check if it's a 404 (order not found)
    if (error?.status === 404 || error?.response?.status === 404) {
      return {
        success: false,
        error: "Order not found. Please check your order number or reference and try again.",
      }
    }

    return {
      success: false,
      error: "Unable to look up your order. Please try again later.",
    }
  }
}
