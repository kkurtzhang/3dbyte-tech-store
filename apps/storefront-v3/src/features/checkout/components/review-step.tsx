"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Loader2, Package, CreditCard, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReviewStepProps {
  onBack: () => void
  onComplete: () => Promise<void> | void
  cartData?: {
    items?: Array<{
      id?: string
      title?: string
      quantity?: number
      unit_price?: number
      product?: {
        title?: string
        thumbnail?: string
      }
      variant?: {
        title?: string
      }
    }>
    shippingAddress?: {
      first_name?: string
      last_name?: string
      address_1?: string
      address_2?: string
      city?: string
      province?: string
      postal_code?: string
      country_code?: string
    }
    email?: string
    shippingMethod?: {
      name?: string
      price?: number
    }
  }
  isProcessing?: boolean
}

export function ReviewStep({
  onBack,
  onComplete,
  cartData,
  isProcessing = false,
}: ReviewStepProps) {
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await onComplete()
    } catch (err: any) {
      setError(err.message || "Failed to place order")
    }
  }

  const formatPrice = (price?: number) => {
    if (typeof price !== "number") return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price / 100)
  }

  const items = cartData?.items || []
  const shippingAddress = cartData?.shippingAddress
  const shippingMethod = cartData?.shippingMethod
  const email = cartData?.email

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <h2 className="text-xl font-bold">Review Your Order</h2>
        <p className="text-sm text-muted-foreground">
          Please review your order details before placing your order.
        </p>
      </div>

      <Separator />

      {/* Shipping Address */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="h-4 w-4" />
          <h3 className="font-semibold text-sm uppercase tracking-wider">Shipping Address</h3>
        </div>
        <div className="rounded-lg border bg-card p-4 text-sm">
          {shippingAddress ? (
            <div className="space-y-1">
              <p className="font-medium">
                {shippingAddress.first_name} {shippingAddress.last_name}
              </p>
              <p className="text-muted-foreground">
                {shippingAddress.address_1}
                {shippingAddress.address_2 && `, ${shippingAddress.address_2}`}
              </p>
              <p className="text-muted-foreground">
                {shippingAddress.city}, {shippingAddress.province} {shippingAddress.postal_code}
              </p>
              <p className="text-muted-foreground uppercase">{shippingAddress.country_code}</p>
              {email && <p className="text-muted-foreground mt-2">{email}</p>}
            </div>
          ) : (
            <p className="text-muted-foreground">No shipping address provided</p>
          )}
        </div>
      </div>

      {/* Delivery Method */}
      {shippingMethod && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Package className="h-4 w-4" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Delivery Method</h3>
          </div>
          <div className="rounded-lg border bg-card p-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-medium">{shippingMethod.name}</span>
              <span className="text-muted-foreground">
                {shippingMethod.price ? formatPrice(shippingMethod.price) : "Free"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <CreditCard className="h-4 w-4" />
          <h3 className="font-semibold text-sm uppercase tracking-wider">Order Items</h3>
        </div>
        <div className="rounded-lg border bg-card divide-y">
          {items.map((item, index) => (
            <div key={item.id || index} className="p-4 flex gap-4">
              {item.product?.thumbnail && (
                <div className="h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={item.product.thumbnail}
                    alt={item.product.title || "Product"}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {item.product?.title}
                  {item.variant?.title && item.variant.title !== "Default Title" && (
                    <span className="text-muted-foreground"> - {item.variant.title}</span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Qty: {item.quantity}
                </p>
              </div>
              <div className="text-sm font-medium">
                {formatPrice((item.unit_price || 0) * (item.quantity || 1))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-mono">
          Error: {error}
        </div>
      )}

      <Separator />

      <div className="flex gap-4 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1"
        >
          Back to Payment
        </Button>
        <Button
          type="submit"
          className="flex-1 font-mono uppercase tracking-widest"
          size="lg"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Place Order"
          )}
        </Button>
      </div>
    </form>
  )
}
