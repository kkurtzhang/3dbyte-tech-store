"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import {
  addWaitlistItemAction,
  clearWaitlistAction,
  getWaitlistAction,
  removeWaitlistItemAction,
} from "@/app/actions/waitlist"
import type {
  InventoryAlert,
  WaitlistItemInput,
  WaitlistMutationResult,
} from "@/lib/waitlist/types"

export type { InventoryAlert } from "@/lib/waitlist/types"

interface InventoryAlertContextType {
  alerts: InventoryAlert[]
  customerEmail?: string
  addAlert: (alert: WaitlistItemInput) => Promise<WaitlistMutationResult>
  removeAlert: (id: string) => Promise<WaitlistMutationResult>
  removeAlertByProduct: (
    productId: string,
    variantId?: string
  ) => Promise<WaitlistMutationResult>
  clearAlerts: () => Promise<WaitlistMutationResult>
  hasAlert: (productId: string, variantId?: string) => boolean
  isAuthenticated: boolean
  isLoading: boolean
}

const InventoryAlertContext = createContext<InventoryAlertContextType | undefined>(undefined)

export function InventoryAlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [customerEmail, setCustomerEmail] = useState<string | undefined>()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadAlerts() {
      const result = await getWaitlistAction()
      if (!isMounted) {
        return
      }

      if (result.success) {
        setAlerts(result.waitlist)
        setCustomerEmail(result.customerEmail || undefined)
        setIsAuthenticated(true)
      } else if (result.requiresAuth) {
        setIsAuthenticated(false)
      }
      setIsLoading(false)
    }

    void loadAlerts()

    return () => {
      isMounted = false
    }
  }, [])

  const addAlert = useCallback(async (alertData: WaitlistItemInput) => {
    if (
      alerts.some((alert) => {
        if (alert.productId !== alertData.productId) return false
        if (alertData.variantId && alert.variantId !== alertData.variantId) return false
        return true
      })
    ) {
      return { success: true as const }
    }

    const result = await addWaitlistItemAction(alertData)
    if (result.success) {
      setAlerts((prev) => [...prev, result.item])
    }

    return result
  }, [alerts])

  const removeAlert = useCallback(async (id: string) => {
    const existingAlert = alerts.find(
      (alert) => alert.id === id || alert.waitlistId === id
    )

    if (!existingAlert?.waitlistId) {
      return {
        success: false as const,
        error: "Waitlist item was not found.",
      }
    }

    const result = await removeWaitlistItemAction(existingAlert.waitlistId)
    if (result.success) {
      setAlerts((prev) => prev.filter((alert) => alert.waitlistId !== existingAlert.waitlistId))
    }

    return result
  }, [alerts])

  const removeAlertByProduct = useCallback(async (productId: string, variantId?: string) => {
    const existingAlert = alerts.find((alert) => {
      if (alert.productId !== productId) return false
      if (variantId && alert.variantId !== variantId) return false
      return true
    })

    if (!existingAlert) {
      return {
        success: false as const,
        error: "Waitlist item was not found.",
      }
    }

    return removeAlert(existingAlert.id)
  }, [alerts, removeAlert])

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

  const clearAlerts = useCallback(async () => {
    const result = await clearWaitlistAction()
    if (result.success) {
      setAlerts([])
    }

    return result
  }, [])

  return (
    <InventoryAlertContext.Provider
      value={{
        alerts,
        customerEmail,
        addAlert,
        removeAlert,
        removeAlertByProduct,
        clearAlerts,
        hasAlert,
        isAuthenticated,
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
