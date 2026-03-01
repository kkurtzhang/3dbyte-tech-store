'use server'

import { sdk } from '@lib/config'
import medusaError from '@lib/util/medusa-error'

import { getAuthHeaders } from './cookies'

export async function retrieveOrder(id: string) {
  const authHeaders = await getAuthHeaders()
  return sdk.store.order
    .retrieve(
      id,
      { fields: '*payment_collections.payments,+fulfillment_status' },
      { next: { tags: ['order'] }, ...authHeaders }
    )
    .then(({ order }) => order)
    .catch((err) => medusaError(err))
}

export async function listOrders(limit: number = 10, offset: number = 0) {
  const authHeaders = await getAuthHeaders()
  return sdk.store.order
    .list({ limit, offset }, { next: { tags: ['order'] }, ...authHeaders })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
}

export async function retrieveOrderTracking(id: string) {
  const authHeaders = await getAuthHeaders()
  return fetch(
    `${process.env.NEXT_PUBLIC_MEDUSA_URL}/store/orders/${id}/tracking`,
    {
      method: 'GET',
      headers: {
        ...authHeaders,
      },
      next: { tags: ['order-tracking'] },
    }
  )
    .then((res) => res.json())
    .catch((err) => medusaError(err))
}

export async function cancelOrder(id: string, reason?: string) {
  const authHeaders = await getAuthHeaders()
  return fetch(
    `${process.env.NEXT_PUBLIC_MEDUSA_URL}/store/orders/${id}/cancel`,
    {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: reason ? JSON.stringify({ reason }) : undefined,
    }
  )
    .then((res) => {
      if (!res.ok) {
        return res.json().then((err) => {
          throw new Error(err.message || 'Failed to cancel order')
        })
      }
      return res.json()
    })
    .catch((err) => medusaError(err))
}
