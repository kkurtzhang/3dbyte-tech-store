"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useCart } from "./cart-context"

export interface WishlistItem {
  id: string
  handle: string
  title: string
  thumbnail: string
  price: {
    amount: number
    currency_code: string
  }
  variantId?: string
}

interface WishlistContextType {
  wishlist: WishlistItem[]
  isLoading: boolean
  addToWishlist: (item: WishlistItem) => void
  removeFromWishlist: (id: string) => void
  isInWishlist: (id: string) => boolean
  clearWishlist: () => void
  moveToCart: (item: WishlistItem) => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

const WISHLIST_STORAGE_KEY = "3dbyte-wishlist"

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { addItem: addToCart } = useCart()

  // Load wishlist from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY)
      if (stored) {
        setWishlist(JSON.parse(stored))
      }
    } catch (error) {
      console.error("Failed to load wishlist from localStorage", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist))
      } catch (error) {
        console.error("Failed to save wishlist to localStorage", error)
      }
    }
  }, [wishlist, isLoading])

  const addToWishlist = (item: WishlistItem) => {
    setWishlist((prev) => {
      // Check if item already exists
      const exists = prev.some((w) => w.id === item.id)
      if (exists) {
        return prev
      }
      return [...prev, item]
    })
  }

  const removeFromWishlist = (id: string) => {
    setWishlist((prev) => prev.filter((item) => item.id !== id))
  }

  const isInWishlist = (id: string) => {
    return wishlist.some((item) => item.id === id)
  }

  const clearWishlist = () => {
    setWishlist([])
  }

  const moveToCart = async (item: WishlistItem) => {
    if (item.variantId) {
      await addToCart(item.variantId, 1)
      removeFromWishlist(item.id)
    }
  }

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
