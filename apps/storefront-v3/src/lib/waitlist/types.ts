export interface WaitlistItemInput {
  email?: string
  productId: string
  productHandle: string
  productTitle: string
  variantId?: string
  variantTitle?: string
}

export interface InventoryAlert extends WaitlistItemInput {
  id: string
  waitlistId?: string
  variantId: string
  variantTitle: string
  email: string
  createdAt: string
  notified: boolean
}

export type WaitlistMutationResult =
  | { success: true; item?: InventoryAlert }
  | { success: false; error: string; requiresAuth?: boolean }
