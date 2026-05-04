import { Metadata } from "next"
import { getSessionAction } from "@/app/actions/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, ChevronRight } from "lucide-react"
import { listOrders, ORDER_TRACKING_FIELDS } from "@/lib/medusa/orders"
import type { MedusaOrder } from "@/lib/medusa/types"
import { getOrderLifecycle, getOrderLifecycleToneClass } from "@/features/order/lib/order-lifecycle"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Orders",
  description: "View your order history and track shipments",
}

async function getOrders(): Promise<MedusaOrder[]> {
  try {
    const { orders } = await listOrders({
      limit: 20,
      fields: ORDER_TRACKING_FIELDS,
    })

    return orders
  } catch (error) {
    console.error("Failed to fetch orders:", error)
    return []
  }
}

function formatPrice(amount: number | null | undefined, currencyCode: string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "usd",
  }).format(amount || 0)
}

export default async function OrdersPage() {
  const session = await getSessionAction()

  if (!session.success) {
    redirect("/sign-in")
  }

  const orders = await getOrders()

  if (orders.length === 0) {
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

        <div className="rounded-lg border bg-card p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-mono font-semibold uppercase tracking-wider mb-2">
            No Orders Yet
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            You haven't placed any orders yet.
          </p>
          <Link href="/">
            <Button className="font-mono uppercase tracking-widest">
              Start Shopping
            </Button>
          </Link>
        </div>
      </div>
    )
  }

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

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-4 font-mono text-sm font-semibold uppercase tracking-wider">
                  Order
                </th>
                <th className="text-left p-4 font-mono text-sm font-semibold uppercase tracking-wider hidden md:table-cell">
                  Date
                </th>
                <th className="text-left p-4 font-mono text-sm font-semibold uppercase tracking-wider hidden sm:table-cell">
                  Status
                </th>
                <th className="text-right p-4 font-mono text-sm font-semibold uppercase tracking-wider">
                  Total
                </th>
                <th className="text-right p-4 font-mono text-sm font-semibold uppercase tracking-wider">
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => {
                const lifecycle = getOrderLifecycle(order)

                return (
                  <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="font-mono text-sm hover:text-primary transition-colors"
                      >
                        #{order.id.slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-xs uppercase tracking-wider",
                          getOrderLifecycleToneClass(lifecycle.tone)
                        )}
                      >
                        {lifecycle.label}
                      </Badge>
                      {lifecycle.groups.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lifecycle.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-mono text-sm">
                        {formatPrice(order.total, order.currency_code)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/account/orders/${order.id}`}>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
