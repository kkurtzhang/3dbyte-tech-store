"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Package, MapPin, CreditCard, ArrowRight, AlertCircle, CheckCircle } from "lucide-react"
import { lookupOrder } from "@/app/actions/track-order"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { StoreOrder } from "@medusajs/types"

type OrderStatus = "pending" | "processing" | "shipped" | "completed" | "cancelled" | "refunded"

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  completed: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
}

const statusSteps: Record<OrderStatus, string[]> = {
  pending: ["Order placed"],
  processing: ["Order placed", "Processing"],
  shipped: ["Order placed", "Processing", "Shipped", "In Transit"],
  completed: ["Order placed", "Processing", "Shipped", "Delivered"],
  cancelled: ["Order placed", "Cancelled"],
  refunded: ["Order placed", "Refunded"],
}

function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium font-mono uppercase tracking-wider
      ${status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
      ${status === "shipped" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" : ""}
      ${status === "processing" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" : ""}
      ${status === "pending" ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" : ""}
      ${status === "cancelled" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : ""}
      ${status === "refunded" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : ""}
    `}>
      {statusLabels[status as OrderStatus] || status}
    </span>
  )
}

function OrderProgress({ status }: { status: string }) {
  const steps = statusSteps[status as OrderStatus] || ["Order placed"]
  const currentStep = Math.min(steps.length - 1, 
    status === "completed" ? 3 :
    status === "shipped" ? 2 :
    status === "processing" ? 1 : 0
  )

  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => (
        <div key={step} className="flex flex-col items-center flex-1 relative">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
            index <= currentStep 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          }`}>
            {index < currentStep ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <span className="text-xs font-medium">{index + 1}</span>
            )}
          </div>
          <span className={`text-xs mt-2 text-center ${index <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>
            {step}
          </span>
          {index < steps.length - 1 && (
            <div className={`absolute top-4 left-1/2 w-full h-0.5 -translate-y-1/2 ${
              index < currentStep ? "bg-primary" : "bg-muted"
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

function OrderDetails({ order }: { order: StoreOrder }) {
  const orderId = order.id
  const orderNumber = orderId.slice(-8).toUpperCase()
  const orderStatus = (order.status || "pending") as OrderStatus

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono uppercase">
            Order #{orderNumber}
          </h1>
          <p className="text-muted-foreground mt-1">
            Placed on {new Date(order.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <OrderStatusBadge status={orderStatus} />
      </div>

      {/* Progress */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="font-mono font-semibold uppercase tracking-wider text-sm mb-6">
          Order Progress
        </h2>
        <OrderProgress status={orderStatus} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Items & Shipping */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="bg-muted/50 px-6 py-3 border-b">
              <h2 className="font-mono font-semibold uppercase tracking-wider text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                Items Ordered
              </h2>
            </div>
            <div className="divide-y">
              {order.items?.map((item: any) => (
                <div key={item.id} className="p-6 flex gap-4">
                  <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden shrink-0">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title || item.product_title || "Product"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">
                      {item.title || item.product_title || "Product"}
                    </h3>
                    {item.variant_title && item.variant_title !== "Default Title" && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.variant_title}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Qty: {item.quantity}</span>
                      <span className="font-mono">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: order.currency_code || "usd",
                        }).format((item.total || item.unit_price * item.quantity || 0) / 100)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Info */}
          {order.shipping_address && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="font-mono font-semibold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Shipping Address
              </h2>
              <address className="text-sm text-muted-foreground not-italic">
                {order.shipping_address.first_name} {order.shipping_address.last_name}
                <br />
                {order.shipping_address.address_1}
                {order.shipping_address.address_2 && (
                  <>
                    <br />
                    {order.shipping_address.address_2}
                  </>
                )}
                <br />
                {order.shipping_address.city}, {order.shipping_address.province || order.shipping_address.postal_code}
                <br />
                {order.shipping_address.country_code?.toUpperCase()}
              </address>
            </div>
          )}
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-6">
          {/* Summary */}
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
              {(order.tax_total || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-mono">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: order.currency_code || "usd",
                    }).format((order.tax_total || 0) / 100)}
                  </span>
                </div>
              )}
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

          {/* Payment */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="font-mono font-semibold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment
            </h2>
            <p className="text-sm capitalize">{order.payment_status?.replace("_", " ") || "Paid"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LookupForm() {
  const router = useRouter()
  const [orderId, setOrderId] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<StoreOrder | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setResult(null)

    const response = await lookupOrder(orderId, email)
    
    setIsLoading(false)
    
    if (response.success && response.order) {
      setResult(response.order)
    } else {
      setError(response.error || "An error occurred")
    }
  }

  if (result) {
    return <OrderDetails order={result} />
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-lg border p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Track Your Order</h1>
          <p className="text-muted-foreground mt-2">
            Enter your order details to check the status
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="orderId" className="text-sm font-medium leading-none">
              Order ID
            </label>
            <Input
              id="orderId"
              placeholder="e.g., order_abc123xyz"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Found in your confirmation email
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>Looking up order...</>
            ) : (
              <>
                Track Order
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Need help?{" "}
        <Link href="/contact" className="text-primary hover:underline">
          Contact us
        </Link>
      </p>
    </div>
  )
}

export default function TrackOrderPage() {
  return (
    <div className="container py-12 md:py-16">
      <LookupForm />
    </div>
  )
}
