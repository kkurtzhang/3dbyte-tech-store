"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"

export interface InventoryAlert {
  id: string
  productId: string
  productHandle: string
  productTitle: string
  variantTitle: string
  variantId: string
  email: string
  createdAt: string
  notified: boolean
}

interface InventoryAlertContextType {
  alerts: InventoryAlert[]
  addAlert: (alert: Omit<InventoryAlert, "id" | "createdAt" | "notified">) => void
  removeAlert: (id: string) => void
  removeAlertByProduct: (productId: string, variantId?: string) => void
  clearAlerts: () => void
  hasAlert: (productId: string, variantId?: string) => boolean
  isLoading: boolean
}

const STORAGE_KEY = "inventory_alerts"

const InventoryAlertContext = createContext<InventoryAlertContextType | undefined>(undefined)

export function InventoryAlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load alerts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setAlerts(JSON.parse(stored))
      }
    } catch (error) {
      console.error("Failed to load inventory alerts:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save alerts to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
      } catch (error) {
        console.error("Failed to save inventory alerts:", error)
      }
    }
  }, [alerts, isLoading])

  const addAlert = useCallback((alertData: Omit<InventoryAlert, "id" | "createdAt" | "notified">) => {
    const newAlert: InventoryAlert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      notified: false,
    }
    setAlerts((prev) => [...prev, newAlert])
  }, [])

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
  }, [])

  const removeAlertByProduct = useCallback((productId: string, variantId?: string) => {
    setAlerts((prev) =>
      prev.filter((alert) => {
        if (alert.productId !== productId) return true
        if (variantId && alert.variantId !== variantId) return true
        return false
      })
    )
  }, [])

  const hasAlert = useCallback(
    (productId: string, variantId?: string): boolean => {
      return alerts.some((alert) => {
        if (alert.productId !== productId) return false
        if (variantId && alert.variantId !== variantId) return false
        return true
      })
    },
    [alerts]
  )

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  return (
    <InventoryAlertContext.Provider
      value={{
        alerts,
        addAlert,
        removeAlert,
        removeAlertByProduct,
        clearAlerts,
        hasAlert,
        isLoading,
      }}
    >
      {children}
    </InventoryAlertContext.Provider>
  )
}

export function useInventoryAlerts() {
  const context = useContext(InventoryAlertContext)
  if (context === undefined) {
    throw new Error("useInventoryAlerts must be used within an InventoryAlertProvider")
  }
  return context
}
