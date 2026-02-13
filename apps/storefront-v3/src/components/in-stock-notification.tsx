"use client"

import { useEffect, useState } from "react"
import { useInventoryAlerts, InventoryAlert } from "@/context/inventory-alert-context"
import { Button } from "@/components/ui/button"
import { CheckCircle2, X } from "lucide-react"
import Link from "next/link"

// Mock in-stock products - in production this would come from the backend
const mockInStockProductIds: string[] = []

export function InStockNotification() {
  const { alerts, removeAlertByProduct } = useInventoryAlerts()
  const [availableAlerts, setAvailableAlerts] = useState<InventoryAlert[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Filter alerts that match in-stock products
    const available = alerts.filter((alert) => {
      // Check if this alert is in our mock in-stock list
      const isAvailable = mockInStockProductIds.includes(alert.productId)
      
      // For demo: randomly consider some alerts as available (10% chance on page load)
      // In production, use real API to check inventory
      const isDemoAvailable = Math.random() < 0.1
      
      return (isAvailable || isDemoAvailable) && !dismissedIds.has(alert.id)
    })
    
    setAvailableAlerts(available)
    
    // Show notification when there are available products
    if (available.length > 0) {
      // Use setTimeout to ensure component is mounted
      setTimeout(() => setIsVisible(true), 500)
    }
  }, [alerts, dismissedIds])

  const handleDismiss = (alertId: string) => {
    setDismissedIds((prev) => new Set(prev).add(alertId))
    setIsVisible(false)
  }

  const handleViewProduct = (alert: InventoryAlert) => {
    removeAlertByProduct(alert.productId)
    setIsVisible(false)
    // Navigate to product page
    window.location.href = `/products/${alert.productHandle}`
  }

  if (!isVisible || availableAlerts.length === 0) {
    return null
  }

  const currentAlert = availableAlerts[0]

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3">
          <div className="bg-green-100 dark:bg-green-900 rounded-full p-2 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-green-900 dark:text-green-100">
              Products Back in Stock!
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              {availableAlerts.length === 1 ? (
                <>
                  <span className="font-medium">{currentAlert.productTitle}</span>{" "}
                  is now available
                </>
              ) : (
                <>
                  <span className="font-medium">{availableAlerts.length} products</span>{" "}
                  you were interested in are now available
                </>
              )}
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleViewProduct(currentAlert)}
              >
                View Product
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(currentAlert.id)}
              >
                Dismiss
              </Button>
            </div>
          </div>
          <button
            onClick={() => handleDismiss(currentAlert.id)}
            className="text-green-600 hover:text-green-900 dark:hover:text-green-100"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
