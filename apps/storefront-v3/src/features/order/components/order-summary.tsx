import { CheckCircle2 } from "lucide-react"
import { StoreOrder } from "@medusajs/types"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export interface OrderSummaryProps {
  order: StoreOrder
  className?: string
}

export function OrderSummary({ order, className }: OrderSummaryProps) {
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount)
  }

  const getOrderStatus = (order: StoreOrder) => {
    if (!order.status) return { label: "Unknown", variant: "secondary" as const }

    switch (order.status) {
      case "pending":
        return { label: "Pending", variant: "secondary" as const }
      case "completed":
        return { label: "Completed", variant: "default" as const }
      case "canceled":
        return { label: "Canceled", variant: "destructive" as const }
      case "requires_action":
        return { label: "Requires Action", variant: "default" as const }
      default:
        return { label: order.status, variant: "secondary" as const }
    }
  }

  const getPaymentStatus = (order: StoreOrder) => {
    if (!order.payment_status) return "Unknown"

    switch (order.payment_status) {
      case "not_paid":
        return "Not Paid"
      case "captured":
        return "Paid"
      case "refunded":
        return "Refunded"
      case "partially_refunded":
        return "Partially Refunded"
      default:
        return order.payment_status
    }
  }

  const getFulfillmentStatus = (order: StoreOrder) => {
    if (!order.fulfillment_status) return "Unknown"

    switch (order.fulfillment_status) {
      case "not_fulfilled":
        return "Not Fulfilled"
      case "fulfilled":
        return "Fulfilled"
      case "partially_fulfilled":
        return "Partially Fulfilled"
      case "shipped":
        return "Shipped"
      case "partially_shipped":
        return "Partially Shipped"
      case "delivered":
        return "Delivered"
      default:
        return order.fulfillment_status
    }
  }

  const status = getOrderStatus(order)
  const currencyCode = order.currency_code || "USD"

  return (
    <div className={cn("space-y-6", className)}>
      {/* Order Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Order ID</p>
          <p className="font-mono text-sm font-medium">{order.id}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="text-sm">
            {order.created_at
              ? new Date(order.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "N/A"}
          </p>
        </div>
      </div>

      <Separator />

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
            status.variant === "default" &&
              "border-primary/50 bg-primary/10 text-primary",
            status.variant === "secondary" &&
              "border-muted-foreground/50 bg-muted text-muted-foreground",
            status.variant === "destructive" &&
              "border-destructive/50 bg-destructive/10 text-destructive"
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          {status.label}
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium bg-card">
          Payment: {getPaymentStatus(order)}
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium bg-card">
          Fulfillment: {getFulfillmentStatus(order)}
        </div>
      </div>

      <Separator />

      {/* Order Items */}
      <div className="space-y-4">
        <h3 className="font-medium">Items</h3>
        <div className="space-y-3">
          {order.items?.map((item) => {
            const unitPrice = (item.unit_price || 0) / 100
            const totalPrice = unitPrice * (item.quantity || 0)

            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.variant?.title &&
                    item.variant.title !== "Default" && (
                      <p className="text-xs text-muted-foreground">
                        {item.variant.title}
                      </p>
                    )}
                  <p className="text-xs text-muted-foreground">
                    Qty: {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">
                    {formatPrice(unitPrice, currencyCode)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(totalPrice, currencyCode)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Shipping Address */}
      {order.shipping_address && (
        <div className="space-y-2">
          <h3 className="font-medium">Shipping Address</h3>
          <div className="text-sm space-y-0.5">
            <p>
              {order.shipping_address.first_name}{" "}
              {order.shipping_address.last_name}
            </p>
            {order.shipping_address.company && (
              <p className="text-muted-foreground">
                {order.shipping_address.company}
              </p>
            )}
            <p>{order.shipping_address.address_1}</p>
            {order.shipping_address.address_2 && (
              <p>{order.shipping_address.address_2}</p>
            )}
            <p>
              {order.shipping_address.city}
              {order.shipping_address.province
                ? `, ${order.shipping_address.province}`
                : ""}
              {` ${order.shipping_address.postal_code}`}
            </p>
            <p>{order.shipping_address.country_code}</p>
          </div>
        </div>
      )}

      <Separator />

      {/* Totals */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-mono">
            {formatPrice((order.subtotal || 0) / 100, currencyCode)}
          </span>
        </div>

        {order.shipping_total && order.shipping_total > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-mono">
              {formatPrice(order.shipping_total / 100, currencyCode)}
            </span>
          </div>
        )}

        {order.tax_total && order.tax_total > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-mono">
              {formatPrice(order.tax_total / 100, currencyCode)}
            </span>
          </div>
        )}

        {order.discount_total && order.discount_total > 0 && (
          <div className="flex justify-between text-sm text-primary">
            <span>Discount</span>
            <span className="font-mono">
              -{formatPrice(order.discount_total / 100, currencyCode)}
            </span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span className="font-mono">
            {formatPrice((order.total || 0) / 100, currencyCode)}
          </span>
        </div>
      </div>
    </div>
  )
}
