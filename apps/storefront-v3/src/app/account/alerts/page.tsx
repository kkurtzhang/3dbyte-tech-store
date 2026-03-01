"use client"

import { useInventoryAlerts, InventoryAlert } from "@/context/inventory-alert-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, ExternalLink, Mail, Bell, Package } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/lib/hooks/use-toast"

export default function AlertsPage() {
  const { alerts, removeAlert, isLoading } = useInventoryAlerts()
  const { toast } = useToast()

  const handleRemoveAlert = (alert: InventoryAlert) => {
    removeAlert(alert.id)
    toast({
      title: "Alert Removed",
      description: `You will no longer receive notifications for ${alert.productTitle}.`,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-muted"></div>
          <p className="text-sm text-muted-foreground">Loading alerts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Alerts</h1>
        <p className="text-muted-foreground mt-2">
          Manage your product availability notifications.
        </p>
      </div>

      {alerts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              You haven&apos;t subscribed to any product notifications yet. 
              Browse our products and click &quot;Notify Me&quot; on out-of-stock items to get notified when they become available.
            </p>
            <Button asChild>
              <Link href="/shop">
                <Package className="mr-2 h-4 w-4" />
                Browse Products
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {alerts.length} active alert{alerts.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="grid gap-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">
                          {alert.productTitle}
                        </span>
                        {alert.variantTitle && (
                          <span className="text-sm text-muted-foreground">
                            ({alert.variantTitle})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {alert.email}
                        </span>
                        <span>
                          Created {new Date(alert.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="shrink-0"
                      >
                        <Link
                          href={`/products/${alert.productHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">View Product</span>
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAlert(alert)}
                        className="shrink-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove Alert</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => {
                alerts.forEach((alert) => removeAlert(alert.id))
                toast({
                  title: "All Alerts Cleared",
                  description: "You have removed all inventory alerts.",
                })
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Alerts
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
