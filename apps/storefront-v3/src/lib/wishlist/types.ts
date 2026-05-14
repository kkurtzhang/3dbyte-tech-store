export interface WishlistItem {
  id: string
  wishlistId?: string
  handle: string
  title: string
  thumbnail: string
  price: {
    amount: number
    currency_code: string
  }
  variantId?: string
}

export interface WishlistMutationResult {
  success: boolean
  error?: string
  requiresAuth?: boolean
}
