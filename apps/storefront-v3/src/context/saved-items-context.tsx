"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { StoreCartLineItem } from "@medusajs/types"

interface SavedItem extends StoreCartLineItem {
  savedAt: number
}

interface SavedItemsContextType {
  savedItems: SavedItem[]
  isLoading: boolean
  saveItem: (item: StoreCartLineItem) => void
  removeSavedItem: (lineItemId: string) => void
  moveToCart: (item: SavedItem) => void
  isSaved: (lineItemId: string) => boolean
}

const SavedItemsContext = createContext<SavedItemsContextType | undefined>(undefined)

const STORAGE_KEY = "saved_items"

export function SavedItemsProvider({ children }: { children: ReactNode }) {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load saved items from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setSavedItems(JSON.parse(stored))
      }
    } catch (error) {
      console.error("Failed to load saved items:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save to localStorage whenever savedItems changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedItems))
      } catch (error) {
        console.error("Failed to save saved items:", error)
      }
    }
  }, [savedItems, isLoading])

  const saveItem = (item: StoreCartLineItem) => {
    const savedItem: SavedItem = {
      ...item,
      savedAt: Date.now(),
    }
    setSavedItems((prev) => {
      // Don't duplicate - check if already saved
      if (prev.some((i) => i.id === item.id)) {
        return prev
      }
      return [...prev, savedItem]
    })
  }

  const removeSavedItem = (lineItemId: string) => {
    setSavedItems((prev) => prev.filter((item) => item.id !== lineItemId))
  }

  const moveToCart = (item: SavedItem) => {
    // Remove from saved items - the cart context will handle adding to cart
    removeSavedItem(item.id)
  }

  const isSaved = (lineItemId: string) => {
    return savedItems.some((item) => item.id === lineItemId)
  }

  return (
    <SavedItemsContext.Provider
      value={{
        savedItems,
        isLoading,
        saveItem,
        removeSavedItem,
        moveToCart,
        isSaved,
      }}
    >
      {children}
    </SavedItemsContext.Provider>
  )
}

export function useSavedItems() {
  const context = useContext(SavedItemsContext)
  if (context === undefined) {
    throw new Error("useSavedItems must be used within a SavedItemsProvider")
  }
  return context
}
