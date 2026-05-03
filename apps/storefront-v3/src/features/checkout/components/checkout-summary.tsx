"use client"

import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import type { MedusaCart } from "@/lib/medusa/cart"
import { buildCartDisplayGroups } from "@/features/cart/lib/bundle-groups"
import { analyzeCartContents } from "@/lib/util/cart-analysis"
import { getCartItemVariantTitle } from "@/features/cart/lib/variant-display"
import { isPreorder } from "@/lib/util/is-preorder"
import type { MedusaCartLineItemWithPreorder } from "@/lib/medusa/types"
import { cn } from "@/lib/utils"
import { useCart } from "@/context/cart-context"
import { CartLinePrice } from "@/features/cart/components/cart-line-price"
import { resolveCartLineRegularUnitPrice } from "@/features/cart/lib/cart-line-pricing"
import { useCheckoutSummaryEstimate } from "./checkout-summary-estimate-context"

interface CheckoutSummaryProps {
  cart: MedusaCart
}

export function CheckoutSummary({ cart: ssrCart }: CheckoutSummaryProps) {
  const { cart: contextCart } = useCart()
  const checkoutSummaryEstimate = useCheckoutSummaryEstimate()
  const cart = contextCart ?? ssrCart
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const currencyCode = cart.region?.currency_code || "usd"
  const itemSubtotal =
    typeof cart.item_subtotal === "number" ? cart.item_subtotal : cart.subtotal || 0
  const cartDisplayGroups = buildCartDisplayGroups(cart.items)
  const cartAnalysis = analyzeCartContents(cart.items, currencyCode)
  const hasShippingMethod =
    Array.isArray(cart.shipping_methods) && cart.shipping_methods.length > 0
  const hasShippingAddress = Boolean(cart.shipping_address)
  const shippingTotal =
    hasShippingMethod && typeof cart.shipping_subtotal === "number"
      ? cart.shipping_subtotal
      : hasShippingMethod && typeof cart.shipping_total === "number"
        ? cart.shipping_total
      : !hasShippingMethod && typeof checkoutSummaryEstimate?.estimatedShippingTotal === "number"
        ? checkoutSummaryEstimate.estimatedShippingTotal
        : null
  const displayedTotal =
    !hasShippingMethod &&
    typeof checkoutSummaryEstimate?.estimatedShippingTotal === "number"
      ? (cart.total || 0) + checkoutSummaryEstimate.estimatedShippingTotal
      : cart.total || 0
  const taxTotal =
    (hasShippingMethod || hasShippingAddress) &&
    typeof cart.tax_total === "number"
      ? cart.tax_total
      : null

  const formatAvailabilityDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const renderItem = (item: NonNullable<MedusaCart["items"]>[number], keyPrefix?: string) => {
    const preorderItem = item as MedusaCartLineItemWithPreorder
    const regularUnitPrice = resolveCartLineRegularUnitPrice(item, currencyCode)
    const displayUnitPrice = item.unit_price ?? 0
    const displayLineTotal =
      typeof item.subtotal === "number"
          ? item.subtotal
          : typeof item.total === "number"
            ? item.total
            : displayUnitPrice * item.quantity
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
              No image
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
                {new Date(
                  preorderItem.variant!.preorder_variant!.available_date
                ).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <CartLinePrice
                currencyCode={currencyCode}
                price={displayUnitPrice}
                regularPrice={regularUnitPrice}
                className="text-muted-foreground"
              />
            </div>
          )}
          {!isPreorder(preorderItem.variant?.preorder_variant) && (
            <CartLinePrice
              currencyCode={currencyCode}
              price={displayUnitPrice}
              regularPrice={regularUnitPrice}
              className="text-muted-foreground"
            />
          )}
        </div>
        <div className="flex items-center font-mono text-sm font-medium">
          {formatPrice(displayLineTotal, currencyCode)}
        </div>
      </div>
    )
  }

  return (
    <div data-testid="order-summary" className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-4 font-mono text-lg font-medium uppercase tracking-wider text-muted-foreground">
        Order summary
      </h2>

      <div className="flex flex-col gap-4">
        {cartDisplayGroups.map((group) =>
          group.type === "bundle" ? (
            <div
              key={group.bundleId}
              className="rounded-lg border border-dashed border-primary/30 bg-primary/5"
            >
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">{group.bundleTitle ?? "Product Bundle"}</p>
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
          <span className="font-mono">{formatPrice(itemSubtotal, currencyCode)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span className={cn("font-mono", shippingTotal === null && "text-muted-foreground")}>
            {shippingTotal === null ? "Calculated next" : formatPrice(shippingTotal, currencyCode)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Taxes</span>
          <span className={cn("font-mono", taxTotal === null && "text-muted-foreground")}>
            {taxTotal === null ? "Calculated next" : formatPrice(taxTotal, currencyCode)}
          </span>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="flex justify-between text-base font-medium">
        <span>Total</span>
        <span className="font-mono text-lg text-primary">
          {formatPrice(displayedTotal, currencyCode)}
        </span>
      </div>
    </div>
  )
}
