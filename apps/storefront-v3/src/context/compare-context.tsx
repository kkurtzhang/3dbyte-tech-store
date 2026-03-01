"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

export interface CompareItem {
  id: string
  handle: string
  title: string
  thumbnail: string
  price: {
    amount: number
    currency_code: string
  }
  specs?: {
    label: string
    value: string
  }[]
}

interface CompareContextType {
  compareList: CompareItem[]
  isLoading: boolean
  addToCompare: (item: CompareItem) => void
  removeFromCompare: (id: string) => void
  isInCompare: (id: string) => boolean
  clearCompare: () => void
  toggleCompare: (item: CompareItem) => void
}

const CompareContext = createContext<CompareContextType | undefined>(undefined)

const COMPARE_STORAGE_KEY = "3dbyte-compare"

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<CompareItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load compare list from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COMPARE_STORAGE_KEY)
      if (stored) {
        setCompareList(JSON.parse(stored))
      }
    } catch (error) {
      console.error("Failed to load compare list from localStorage", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save compare list to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareList))
      } catch (error) {
        console.error("Failed to save compare list to localStorage", error)
      }
    }
  }, [compareList, isLoading])

  const addToCompare = (item: CompareItem) => {
    setCompareList((prev) => {
      // Check if item already exists
      const exists = prev.some((c) => c.id === item.id)
      if (exists) {
        return prev
      }
      // Limit to 4 items for better comparison view
      if (prev.length >= 4) {
        return prev
      }
      return [...prev, item]
    })
  }

  const removeFromCompare = (id: string) => {
    setCompareList((prev) => prev.filter((item) => item.id !== id))
  }

  const isInCompare = (id: string) => {
    return compareList.some((item) => item.id === id)
  }

  const clearCompare = () => {
    setCompareList([])
  }

  const toggleCompare = (item: CompareItem) => {
    if (isInCompare(item.id)) {
      removeFromCompare(item.id)
    } else {
      addToCompare(item)
    }
  }

  return (
    <CompareContext.Provider
      value={{
        compareList,
        isLoading,
        addToCompare,
        removeFromCompare,
        isInCompare,
        clearCompare,
        toggleCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  )
}

export function useCompare() {
  const context = useContext(CompareContext)
  if (context === undefined) {
    throw new Error("useCompare must be used within a CompareProvider")
  }
  return context
}
