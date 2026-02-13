import { Metadata } from "next"
import { getSessionAction } from "@/app/actions/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, ChevronRight } from "lucide-react"
import { sdk } from "@/lib/medusa/client"
import { ReorderButton } from "@/components/reorder/reorder-button"

export const metadata: Metadata = {
  title: "Orders",
  description: "View your order history and track shipments",
}

interface Order {
  id: string
  status: string
  created_at: string
  total: number
  currency_code: string
  items: Array<{
    id: string
    title: string
    quantity: number
    thumbnail?: string
  }>
}

async function getOrders(): Promise<Order[]> {
  try {
    const { orders } = await sdk.store.order.list({
      limit: 20,
    })
    return (orders || []).map(order => ({
      id: order.id,
      status: order.status,
      created_at: typeof order.created_at === 'string' ? order.created_at : order.created_at?.toISOString() || new Date().toISOString(),
      total: order.total,
      currency_code: order.currency_code,
      items: (order.items || []).map(item => ({
        id: item.id,
        title: item.title || item.product_title || 'Product',
        quantity: item.quantity,
        thumbnail: item.thumbnail || undefined
      }))
    }))
  } catch (error) {
    console.error("Failed to fetch orders:", error)
    return []
  }
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
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
                      variant={
                        order.status === "completed"
                          ? "default"
                          : order.status === "shipped"
                          ? "secondary"
                          : "outline"
                      }
                      className="font-mono text-xs uppercase tracking-wider"
                    >
                      {order.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-mono text-sm">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: order.currency_code || "usd",
                      }).format((order.total || 0) / 100)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <ReorderButton orderId={order.id} showText={false} size="sm" variant="ghost" />
                      <Link href={`/account/orders/${order.id}`}>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
