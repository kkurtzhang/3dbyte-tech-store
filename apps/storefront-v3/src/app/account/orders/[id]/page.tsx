import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Package, Truck, CreditCard } from "lucide-react"
import { sdk } from "@/lib/medusa/client"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Order #${id.slice(-8).toUpperCase()}`,
    description: `Order details for order ${id}`,
  }
}

async function getOrder(orderId: string) {
  try {
    const { order } = await sdk.store.order.retrieve(orderId)
    return order
  } catch (error) {
    console.error("Failed to fetch order:", error)
    return null
  }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const order = await getOrder(id)

  if (!order) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/account/orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold uppercase tracking-wider">
            Order #{id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Placed on {new Date(order.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Badge
          variant={
            order.status === "completed"
              ? "default"
              : order.status === "shipped"
              ? "secondary"
              : "outline"
          }
          className="font-mono text-sm uppercase tracking-wider"
        >
          {order.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="bg-muted/50 px-6 py-3 border-b">
              <h2 className="font-mono font-semibold uppercase tracking-wider text-sm">
                Items Ordered
              </h2>
            </div>
            <div className="divide-y">
              {order.items?.map((item: any) => (
                <div key={item.id} className="p-6 flex gap-4">
                  <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden shrink-0">
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-mono font-semibold uppercase tracking-wider text-sm">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Qty: {item.quantity}
                    </p>
                    <p className="font-mono text-sm mt-2">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: order.currency_code || "usd",
                      }).format((item.total || 0) / 100)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Info */}
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="font-mono font-semibold uppercase tracking-wider text-sm">
                Shipping Status
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-sm">Order confirmed</span>
              </div>
              {order.status === "shipped" || order.status === "completed" ? (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-sm">Shipped via Freight</span>
                </div>
              ) : null}
              {order.status === "completed" ? (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-sm">Delivered</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="font-mono font-semibold uppercase tracking-wider text-sm mb-4">
              Order Summary
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: order.currency_code || "usd",
                  }).format((order.subtotal || 0) / 100)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-mono">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: order.currency_code || "usd",
                  }).format((order.shipping_total || 0) / 100)}
                </span>
              </div>
              {(order.discount_total || 0) > 0 && (
                <div className="flex justify-between text-green-500">
                  <span>Discount</span>
                  <span className="font-mono">
                    -{new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: order.currency_code || "usd",
                    }).format((order.discount_total || 0) / 100)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: order.currency_code || "usd",
                  }).format((order.total || 0) / 100)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="font-mono font-semibold uppercase tracking-wider text-sm">
                Payment Method
              </h2>
            </div>
            <p className="text-sm">Visa ending in 4242</p>
            <p className="text-xs text-muted-foreground mt-1">
              Billed to card ending in ****
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
