'use server'

import { resolveMedusaBaseUrl } from '@/lib/medusa/base-url'
import type { MedusaOrder } from '@/lib/medusa/types'

interface OrderLookupResult {
  success: boolean
  order?: MedusaOrder
  error?: string
}

function getMedusaBackendUrl() {
  return resolveMedusaBaseUrl({ isServer: true })
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

    return { success: true, order }
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
