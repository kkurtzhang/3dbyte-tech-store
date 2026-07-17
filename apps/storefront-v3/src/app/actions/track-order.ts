'use server'

import { resolveMedusaBaseUrl } from '@/lib/medusa/base-url'
import type { MedusaOrder, MedusaOrderTrackingPaymentMethod } from '@/lib/medusa/types'

interface OrderLookupResult {
  success: boolean
  order?: MedusaOrder
  error?: string
}

function getMedusaBackendUrl() {
  return resolveMedusaBaseUrl({ isServer: true })
}

function isTrackingPaymentMethod(value: unknown): value is MedusaOrderTrackingPaymentMethod {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const paymentMethod = value as Record<string, unknown>

  return (
    paymentMethod.type === 'card' &&
    typeof paymentMethod.brand === 'string' &&
    typeof paymentMethod.last4 === 'string'
  )
}

async function getTrackingPaymentMethod(orderId: string, email: string) {
  try {
    const paymentMethodUrl = new URL(
      `/store/orders/${orderId}/payment-method`,
      getMedusaBackendUrl()
    )
    paymentMethodUrl.searchParams.set('email', email)

    const response = await fetch(paymentMethodUrl, {
      headers: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
        ? {
            'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
          }
        : undefined,
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as { payment_method?: unknown }

    return isTrackingPaymentMethod(data.payment_method) ? data.payment_method : null
  } catch {
    return null
  }
}

async function lookupOrderByCustomerReference(reference: string, email: string) {
  const lookupUrl = new URL('/store/orders/lookup', getMedusaBackendUrl())
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

  const response = await fetch(lookupUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(publishableKey
        ? { 'x-publishable-api-key': publishableKey }
        : {}),
    },
    body: JSON.stringify({ reference, email }),
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as { order?: MedusaOrder | null }

  return data.order || null
}

export async function lookupOrder(orderId: string, email: string): Promise<OrderLookupResult> {
  try {
    // Clean up the inputs
    const cleanOrderId = orderId.trim()
    const cleanEmail = email.trim().toLowerCase()

    const order = await lookupOrderByCustomerReference(cleanOrderId, cleanEmail)

    if (!order) {
      return {
        success: false,
        error: 'Order not found. Please check your order number or reference and try again.',
      }
    }

    return {
      success: true,
      order: {
        ...order,
        tracking_payment_method: await getTrackingPaymentMethod(order.id, cleanEmail),
      },
    }
  } catch (error: unknown) {
    console.error('Order lookup failed')

    // Check if it's a 404 (order not found)
    const requestError = error as {
      status?: number
      response?: { status?: number }
    }
    if (requestError?.status === 404 || requestError?.response?.status === 404) {
      return {
        success: false,
        error: 'Order not found. Please check your order number or reference and try again.',
      }
    }

    return {
      success: false,
      error: 'Unable to look up your order. Please try again later.',
    }
  }
}
