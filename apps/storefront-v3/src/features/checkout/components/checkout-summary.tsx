"use client"

import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import type { MedusaCart } from "@/lib/medusa/cart"
import { buildCartDisplayGroups } from "@/features/cart/lib/bundle-groups"
import { analyzeCartContents } from "@/lib/util/cart-analysis"
import { getCartItemVariantTitle } from "@/features/cart/lib/variant-display"
import { isPreorder } from "@/lib/util/is-preorder"
import type { MedusaCartLineItemWithPreorder } from "@/lib/medusa/types"
import { resolvePreorderPrice } from "@/lib/util/preorder-pricing"

interface CheckoutSummaryProps {
  cart: MedusaCart
}

export function CheckoutSummary({ cart }: CheckoutSummaryProps) {
  const formatPrice = (amountMinor: number, currency: string) => {
    const amountMajor = amountMinor / 100
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amountMajor)
  }

  const currencyCode = cart.region?.currency_code || "usd"
  const cartDisplayGroups = buildCartDisplayGroups(cart.items)
  const cartAnalysis = analyzeCartContents(cart.items, currencyCode)

  const formatAvailabilityDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const renderItem = (
    item: NonNullable<MedusaCart["items"]>[number],
    keyPrefix?: string
  ) => {
    const preorderItem = item as MedusaCartLineItemWithPreorder
    const preorderPrice = resolvePreorderPrice(preorderItem.variant, currencyCode)
    const displayUnitPrice = preorderPrice?.amount ?? item.unit_price ?? 0
    const variantTitle = getCartItemVariantTitle(item)

    return (
      <div key={keyPrefix ?? item.id} className="flex gap-4">
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
          <p className="text-xs text-muted-foreground">{variantTitle ?? "Standard"}</p>
          {isPreorder(preorderItem.variant?.preorder_variant) && (
            <div className="space-y-0.5 text-xs text-primary">
              <p>
                Pre-order available on{" "}
                {new Date(preorderItem.variant!.preorder_variant!.available_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              {preorderPrice && (
                <p className="text-muted-foreground">
                  Pre-order price: {formatPrice(preorderPrice.amount, currencyCode)}
                </p>
              )}
              {preorderPrice && (
                <p className="line-through text-muted-foreground">
                  Regular price: {formatPrice(item.unit_price || 0, currencyCode)}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center font-mono text-sm font-medium">
          {formatPrice(displayUnitPrice * item.quantity, currencyCode)}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-4 font-mono text-lg font-medium uppercase tracking-wider text-muted-foreground">
        Order_Manifest
      </h2>

      <div className="flex flex-col gap-4">
        {cartDisplayGroups.map((group) =>
          group.type === "bundle" ? (
            <div
              key={group.bundleId}
              className="rounded-lg border border-dashed border-primary/30 bg-primary/5"
            >
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">
                  {group.bundleTitle ?? "Product Bundle"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {group.items.length} {group.items.length === 1 ? "item" : "items"}
                </p>
              </div>
              <div className="space-y-4 px-4 py-4">
                {group.items.map((item) => renderItem(item, `${group.bundleId}-${item.id}`))}
              </div>
            </div>
          ) : (
            renderItem(group.item)
          )
        )}
        {cartAnalysis.hasPreorderItems && cartAnalysis.earliestPreorderDate ? (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
            Pre-order items ship when available. Earliest estimated availability:{" "}
            {formatAvailabilityDate(cartAnalysis.earliestPreorderDate)}.
          </div>
        ) : null}
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
