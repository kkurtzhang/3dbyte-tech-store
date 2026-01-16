import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Orders",
  description: "View your order history and track shipments",
}

/**
 * Orders page - Displays customer order history.
 * Currently a placeholder - will be populated with Medusa order data.
 */
export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold uppercase tracking-wider">
          Orders
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          View and track your order history
        </p>
      </div>

      <div className="rounded-lg border bg-card p-8">
        <p className="text-muted-foreground">
          Your order history will appear here.
        </p>
      </div>
    </div>
  )
}
