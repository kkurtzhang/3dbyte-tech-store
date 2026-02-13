import { getAuthHeaders } from './cookies'

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'

export type WishlistItem = {
  id: string
  customer_id: string
  product_id: string
  product_variant_id: string | null
  created_at: string
  updated_at: string
}

export async function getWishlist() {
  const authHeaders = await getAuthHeaders()

  const response = await fetch(`${BACKEND_URL}/store/wishlist`, {
    method: 'GET',
    headers: authHeaders,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch wishlist')
  }

  const data = await response.json()
  return data.wishlist as WishlistItem[]
}

export async function addToWishlist(productId: string, productVariantId?: string) {
  const authHeaders = await getAuthHeaders()

  const response = await fetch(`${BACKEND_URL}/store/wishlist`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      product_variant_id: productVariantId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to add to wishlist')
  }

  const data = await response.json()
  return data.wishlist as WishlistItem
}

export async function removeFromWishlist(itemId: string) {
  const authHeaders = await getAuthHeaders()

  const response = await fetch(`${BACKEND_URL}/store/wishlist/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders,
  })

  if (!response.ok) {
    throw new Error('Failed to remove from wishlist')
  }

  const data = await response.json()
  return data
}
