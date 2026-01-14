"use client"

import { StoreCart } from "@medusajs/types"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"

interface CheckoutSummaryProps {
  cart: StoreCart
}

export function CheckoutSummary({ cart }: CheckoutSummaryProps) {
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const currencyCode = cart.region?.currency_code || "usd"

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-4 font-mono text-lg font-medium uppercase tracking-wider text-muted-foreground">
        Order_Manifest
      </h2>

      <div className="flex flex-col gap-4">
        {cart.items?.map((item) => (
          <div key={item.id} className="flex gap-4">
            <div className="relative aspect-square h-16 w-16 overflow-hidden rounded-sm border bg-secondary/20">
              {item.variant?.product?.thumbnail ? (
                <Image
                  src={item.variant.product.thumbnail}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-muted-foreground">
                  NO_IMG
                </div>
              )}
              <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                {item.quantity}
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-center">
              <h3 className="line-clamp-1 text-sm font-medium">{item.title}</h3>
              <p className="text-xs text-muted-foreground">
                {item.variant?.title !== "Default Variant" ? item.variant?.title : "Standard"}
              </p>
            </div>
            <div className="flex items-center font-mono text-sm font-medium">
               {formatPrice(item.unit_price * item.quantity, currencyCode)}
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-6" />

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-mono">{formatPrice(cart.subtotal || 0, currencyCode)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span className="font-mono text-muted-foreground">Calculated next</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Taxes</span>
          <span className="font-mono text-muted-foreground">Calculated next</span>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="flex justify-between text-base font-medium">
        <span>Total</span>
        <span className="font-mono text-lg text-primary">
          {formatPrice(cart.total || 0, currencyCode)}
        </span>
      </div>
    </div>
  )
}
