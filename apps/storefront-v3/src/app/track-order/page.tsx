"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Package, CreditCard, ArrowRight, AlertCircle, Truck } from "lucide-react"
import { lookupOrder } from "@/app/actions/track-order"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OrderSummary } from "@/features/order/components/order-summary"
import {
  getOrderLifecycle,
  getOrderLifecycleToneClass,
  type OrderLifecycleGroup,
} from "@/features/order/lib/order-lifecycle"
import { cn } from "@/lib/utils"
import type { MedusaOrder } from "@/lib/medusa/types"

type OrderStatus = "pending" | "processing" | "shipped" | "completed" | "cancelled" | "refunded" | "canceled"

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  completed: "Delivered",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  refunded: "Refunded",
}

function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium font-mono uppercase tracking-wider
      ${status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
      ${status === "shipped" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" : ""}
      ${status === "processing" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" : ""}
      ${status === "pending" ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" : ""}
      ${status === "cancelled" || status === "canceled" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : ""}
      ${status === "refunded" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : ""}
    `}>
      {statusLabels[status as OrderStatus] || status}
    </span>
  )
}

function formatReleaseDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

function OrderLifecycleGroupCard({ group }: { group: OrderLifecycleGroup }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider">
            {group.title}
          </p>
          <p className="mt-1 text-sm font-medium">{group.status}</p>
        </div>
        <span className="rounded-full border px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {group.itemCount} {group.itemCount === 1 ? "item" : "items"}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{group.description}</p>
      {group.releaseDate ? (
        <p className="mt-3 w-fit rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
          Releases on {formatReleaseDate(group.releaseDate)}
        </p>
      ) : null}
    </div>
  )
}

function OrderLifecyclePanel({ order }: { order: MedusaOrder }) {
  const lifecycle = getOrderLifecycle(order)

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-lg border p-4",
          getOrderLifecycleToneClass(lifecycle.tone)
        )}
      >
        <div className="flex items-start gap-3">
          <Truck className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-mono text-sm font-semibold uppercase tracking-wider">
              {lifecycle.label}
            </p>
            <p className="mt-1 text-sm">{lifecycle.description}</p>
          </div>
        </div>
      </div>

      {lifecycle.groups.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {lifecycle.groups.map((group) => (
            <OrderLifecycleGroupCard key={group.id} group={group} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

type CardDetails = {
  brand?: unknown
  last4?: unknown
}

type TrackingPaymentMethod = {
  type?: unknown
  brand?: unknown
  last4?: unknown
}

function humanizeStatus(status: string | null | undefined) {
  if (!status) return "Payment status pending"

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatCardBrand(brand: string) {
  const normalizedBrand = brand.trim().toLowerCase()

  if (normalizedBrand === "visa") return "Visa"
  if (normalizedBrand === "mastercard") return "Mastercard"
  if (normalizedBrand === "amex") return "American Express"

  return normalizedBrand
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getNestedRecord(
  value: Record<string, unknown>,
  key: string
): Record<string, unknown> | null {
  const nestedValue = value[key]

  return isRecord(nestedValue) ? nestedValue : null
}

function getPaymentCard(payment: unknown): CardDetails | null {
  if (!isRecord(payment)) {
    return null
  }

  const data = getNestedRecord(payment, "data")
  if (!data) {
    return null
  }

  const paymentMethodDetails = getNestedRecord(data, "payment_method_details")
  const paymentMethod = getNestedRecord(data, "payment_method")
  const card =
    (paymentMethodDetails && getNestedRecord(paymentMethodDetails, "card")) ||
    (paymentMethod && getNestedRecord(paymentMethod, "card"))

  return card
}

function isStripePayment(payment: unknown) {
  return isRecord(payment) && payment.provider_id === "stripe"
}

function getPaymentMethodDisplay(order: MedusaOrder) {
  const orderWithPayments = order as MedusaOrder & {
    payment_collections?: unknown
    tracking_payment_method?: TrackingPaymentMethod | null
  }
  const trackingPaymentMethod = orderWithPayments.tracking_payment_method

  if (
    trackingPaymentMethod?.type === "card" &&
    typeof trackingPaymentMethod.brand === "string" &&
    typeof trackingPaymentMethod.last4 === "string"
  ) {
    return `${formatCardBrand(trackingPaymentMethod.brand)} ending in ${trackingPaymentMethod.last4}`
  }

  const paymentCollections = Array.isArray(orderWithPayments.payment_collections)
    ? orderWithPayments.payment_collections
    : []
  const payments = paymentCollections.flatMap((collection) => {
    if (!isRecord(collection) || !Array.isArray(collection.payments)) {
      return []
    }

    return collection.payments
  })

  for (const payment of payments) {
    const card = getPaymentCard(payment)

    if (typeof card?.brand === "string" && typeof card?.last4 === "string") {
      return `${formatCardBrand(card.brand)} ending in ${card.last4}`
    }
  }

  if (payments.some(isStripePayment)) {
    return "Card payment"
  }

  return humanizeStatus(order.payment_status)
}

export function OrderDetails({ order }: { order: MedusaOrder }) {
  const orderId = order.id
  const orderNumber = orderId.slice(-8).toUpperCase()
  const orderStatus = (order.status || "pending") as OrderStatus
  const lifecycle = getOrderLifecycle(order)

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
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <OrderStatusBadge status={orderStatus} />
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 font-mono text-sm font-medium uppercase tracking-wider",
              getOrderLifecycleToneClass(lifecycle.tone)
            )}
          >
            {lifecycle.label}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="font-mono font-semibold uppercase tracking-wider text-sm mb-6">
          Order Progress
        </h2>
        <OrderLifecyclePanel order={order} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Shared Order Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="font-mono font-semibold uppercase tracking-wider text-sm mb-6 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Order Details
            </h2>
            <OrderSummary order={order} />
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-6">
          {/* Payment */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="font-mono font-semibold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment
            </h2>
            <p className="text-sm">{getPaymentMethodDisplay(order)}</p>
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
  const [result, setResult] = useState<MedusaOrder | null>(null)

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
