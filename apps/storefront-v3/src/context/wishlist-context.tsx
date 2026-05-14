"use client"

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react"
import {
  addWishlistItemAction,
  clearWishlistAction,
  getWishlistAction,
  removeWishlistItemAction,
} from "@/app/actions/wishlist"
import type { WishlistItem, WishlistMutationResult } from "@/lib/wishlist/types"
import { useCart } from "./cart-context"

interface WishlistContextType {
  wishlist: WishlistItem[]
  isLoading: boolean
  addToWishlist: (item: WishlistItem) => Promise<WishlistMutationResult>
  removeFromWishlist: (id: string) => Promise<WishlistMutationResult>
  isInWishlist: (id: string) => boolean
  clearWishlist: () => Promise<WishlistMutationResult>
  moveToCart: (item: WishlistItem) => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { addItem: addToCart } = useCart()

  const loadWishlist = useCallback(async () => {
    setIsLoading(true)
    const result = await getWishlistAction()
    if (result.success) {
      setWishlist(result.wishlist)
    } else {
      setWishlist([])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadWishlist()
  }, [loadWishlist])

  const addToWishlist = useCallback(async (item: WishlistItem) => {
    if (wishlist.some((wishlistItem) => wishlistItem.id === item.id)) {
      return { success: true }
    }

    const result = await addWishlistItemAction(item)
    if (result.success) {
      setWishlist((prev) => [...prev, result.item])
      return { success: true }
    }

    return result
  }, [wishlist])

  const removeFromWishlist = useCallback(async (id: string) => {
    const existingItem = wishlist.find(
      (item) => item.id === id || item.wishlistId === id
    )

    if (!existingItem?.wishlistId) {
      return {
        success: false,
        error: "Wishlist item not found.",
      }
    }

    const result = await removeWishlistItemAction(existingItem.wishlistId)
    if (result.success) {
      setWishlist((prev) => prev.filter((item) => item.id !== existingItem.id))
    }

    return result
  }, [wishlist])

  const isInWishlist = useCallback((id: string) => {
    return wishlist.some((item) => item.id === id)
  }, [wishlist])

  const clearWishlist = useCallback(async () => {
    const wishlistIds = wishlist
      .map((item) => item.wishlistId)
      .filter((id): id is string => Boolean(id))
    const result = await clearWishlistAction(wishlistIds)
    if (result.success) {
      setWishlist([])
    }

    return result
  }, [wishlist])

  const moveToCart = useCallback(async (item: WishlistItem) => {
    if (item.variantId) {
      await addToCart(item.variantId, 1)
      await removeFromWishlist(item.id)
    }
  }, [addToCart, removeFromWishlist])

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isLoading,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        clearWishlist,
        moveToCart,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return context
}
