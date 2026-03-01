'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WishlistItem } from '@lib/data/wishlist'

interface WishlistStore {
  wishlistItems: WishlistItem[]
  isInWishlist: (productId: string) => boolean
  addToWishlist: (item: WishlistItem) => void
  removeFromWishlist: (itemId: string) => void
  setWishlist: (items: WishlistItem[]) => void
  clearWishlist: () => void
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      wishlistItems: [],

      isInWishlist: (productId: string) => {
        const { wishlistItems } = get()
        return wishlistItems.some((item) => item.product_id === productId)
      },

      addToWishlist: (item: WishlistItem) => {
        set((state) => ({
          wishlistItems: [...state.wishlistItems, item],
        }))
      },

      removeFromWishlist: (itemId: string) => {
        set((state) => ({
          wishlistItems: state.wishlistItems.filter((item) => item.id !== itemId),
        }))
      },

      setWishlist: (items: WishlistItem[]) => {
        set({ wishlistItems: items })
      },

      clearWishlist: () => {
        set({ wishlistItems: [] })
      },
    }),
    {
      name: 'wishlist-storage',
    }
  )
)
