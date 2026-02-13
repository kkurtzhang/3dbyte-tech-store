"use client"

import Link from "next/link"
import { Bell, Trash2, ShoppingCart, ArrowRight, Package, Mail, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useInventoryAlerts, InventoryAlert } from "@/context/inventory-alert-context"
import { toast } from "@/lib/hooks/use-toast"

export function WaitlistClient() {
  const { alerts, isLoading, removeAlert, clearAlerts } = useInventoryAlerts()

  const handleRemoveAlert = (alert: InventoryAlert) => {
    removeAlert(alert.id)
    toast({
      title: "Notification removed",
      description: `You will no longer be notified about ${alert.productTitle}`,
    })
  }

  const handleClearAll = () => {
    clearAlerts()
    toast({
      title: "Waitlist cleared",
      description: "All notifications have been removed",
    })
  }

  const handleGoToProduct = (productHandle: string) => {
    window.location.href = `/products/${productHandle}`
  }

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading waitlist...</p>
          </div>
        </div>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="container py-12">
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">No notifications yet</h1>
          <p className="mb-6 max-w-md text-muted-foreground">
            When products are out of stock, you can sign up to be notified when they become available again.
          </p>
          <Link href="/shop">
            <Button className="gap-2">
              Browse Products
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">My Waitlist</h1>
          <p className="font-mono text-sm text-muted-foreground">
            {alerts.length} {alerts.length === 1 ? "product" : "products"} you're waiting for
          </p>
        </div>
        {alerts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-muted-foreground hover:text-destructive"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Alerts Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm font-mono uppercase tracking-wider text-muted-foreground">
              <th className="pb-4 font-medium">Product</th>
              <th className="pb-4 font-medium">Variant</th>
              <th className="pb-4 font-medium hidden md:table-cell">Email</th>
              <th className="pb-4 font-medium hidden lg:table-cell">Subscribed</th>
              <th className="pb-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr
                key={alert.id}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-secondary overflow-hidden">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <button
                        onClick={() => handleGoToProduct(alert.productHandle)}
                        className="font-medium hover:text-primary hover:underline text-left"
                      >
                        {alert.productTitle}
                      </button>
                      {alert.notified && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Available Now
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 pr-4">
                  {alert.variantTitle ? (
                    <span className="text-sm text-muted-foreground">
                      {alert.variantTitle}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="py-4 pr-4 hidden md:table-cell">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {alert.email}
                  </div>
                </td>
                <td className="py-4 pr-4 hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {new Date(alert.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGoToProduct(alert.productHandle)}
                      className="gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAlert(alert)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="mt-6 space-y-4 md:hidden">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-lg border bg-card p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded bg-secondary">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <button
                    onClick={() => handleGoToProduct(alert.productHandle)}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {alert.productTitle}
                  </button>
                  {alert.variantTitle && (
                    <p className="text-sm text-muted-foreground">
                      {alert.variantTitle}
                    </p>
                  )}
                </div>
              </div>
              {alert.notified && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  Available
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {alert.email}
              </div>
              <span>
                {new Date(alert.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGoToProduct(alert.productHandle)}
                className="flex-1 gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                View Product
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveAlert(alert)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Section */}
      <div className="mt-12 rounded-lg border bg-muted/30 p-6">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          How waitlist notifications work
        </h3>
        <ul className="text-sm text-muted-foreground space-y-2 ml-7 list-disc">
          <li>You'll receive an email when any product on your waitlist is back in stock</li>
          <li>Notifications are stored locally in your browser - they won't sync across devices</li>
          <li>You can remove items from your waitlist at any time</li>
          <li>Once a product becomes available, the notification will be marked as fulfilled</li>
        </ul>
      </div>
    </div>
  )
}
