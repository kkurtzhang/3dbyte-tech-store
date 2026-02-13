"use client"

import { useState, useEffect, useCallback } from "react"
import { StoreProduct } from "@medusajs/types"

const STORAGE_KEY = "recently-viewed-products"
const MAX_ITEMS = 10

interface RecentlyViewedProduct {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  price: number
  currencyCode: string
  viewedAt: string
}

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setRecentlyViewed(parsed)
      }
    } catch (error) {
      console.error("Failed to load recently viewed from localStorage:", error)
    }
  }, [])

  // Save to localStorage whenever recentlyViewed changes
  useEffect(() => {
    try {
      if (recentlyViewed.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentlyViewed))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (error) {
      console.error("Failed to save recently viewed to localStorage:", error)
    }
  }, [recentlyViewed])

  const addToRecentlyViewed = useCallback((product: StoreProduct) => {
    setRecentlyViewed((prev) => {
      // Check if product already exists
      const existingIndex = prev.findIndex((item) => item.id === product.id)

      const newItem: RecentlyViewedProduct = {
        id: product.id,
        handle: product.handle!,
        title: product.title,
        thumbnail: product.thumbnail || null,
        // @ts-expect-error - calculated_price and prices may not be in strict Medusa types
        price: product.variants?.[0]?.calculated_price?.calculated_amount || product.variants?.[0]?.prices?.[0]?.amount || 0,
        // @ts-expect-error - calculated_price and prices may not be in strict Medusa types
        currencyCode: product.variants?.[0]?.calculated_price?.currency_code || product.variants?.[0]?.prices?.[0]?.currency_code || "USD",
        viewedAt: new Date().toISOString(),
      }

      // If exists, remove it first (to move to top)
      let filtered = prev
      if (existingIndex !== -1) {
        filtered = prev.filter((item) => item.id !== product.id)
      }

      // Add to beginning and limit to MAX_ITEMS
      return [newItem, ...filtered].slice(0, MAX_ITEMS)
    })
  }, [])

  const removeFromRecentlyViewed = useCallback((productId: string) => {
    setRecentlyViewed((prev) => prev.filter((item) => item.id !== productId))
  }, [])

  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([])
  }, [])

  return {
    recentlyViewed,
    addToRecentlyViewed,
    removeFromRecentlyViewed,
    clearRecentlyViewed,
  }
}
