import { CheckCircle2 } from "lucide-react"
import { getSafePaymentMethodDisplay } from "@3dbyte-tech-store/shared-utils"
import { Separator } from "@/components/ui/separator"
import { formatCustomerPrice, toCustomerPriceAmount } from "@/lib/pricing/customer-pricing"
import { buildCartDisplayGroups } from "@/features/cart/lib/bundle-groups"
import { getCartItemVariantTitle } from "@/features/cart/lib/variant-display"
import { analyzeCartContents } from "@/lib/util/cart-analysis"
import type { MedusaOrderLineItemWithPreorder } from "@/lib/medusa/types"
import { cn } from "@/lib/utils"
import type { MedusaOrder } from "@/lib/medusa/types"
import { isPreorder } from "@/lib/util/is-preorder"
import { resolvePreorderPrice } from "@/lib/util/preorder-pricing"
import { resolveCartLineRegularUnitPrice } from "@/features/cart/lib/cart-line-pricing"
import { getOrderLifecycle } from "@/features/order/lib/order-lifecycle"
import { OrderTotalsSummary } from "./order-totals-summary"

export interface OrderSummaryProps {
  order: MedusaOrder
  className?: string
}

type OrderAddress = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
}

const countryNames = new Map([
  ["au", "Australia"],
  ["ca", "Canada"],
  ["gb", "United Kingdom"],
  ["nz", "New Zealand"],
  ["us", "United States"],
])

export const getCustomerOrderNumber = (order: MedusaOrder): string => {
  const orderWithDisplayIds = order as MedusaOrder & {
    custom_display_id?: string | null
    display_id?: number | string | null
  }
  const customDisplayId = orderWithDisplayIds.custom_display_id?.trim()

  if (customDisplayId) return customDisplayId
  if (orderWithDisplayIds.display_id) return `#${orderWithDisplayIds.display_id}`

  return order.id
}

export const getOrderTrackingReference = (order: MedusaOrder): string => {
  const orderWithDisplayIds = order as MedusaOrder & {
    custom_display_id?: string | null
  }

  return orderWithDisplayIds.custom_display_id?.trim() || order.id
}

const getAddressLines = (address?: OrderAddress | null): string[] => {
  if (!address) return []

  const name = [address.first_name, address.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()
  const cityLine = [address.city, address.province, address.postal_code]
    .filter(Boolean)
    .join(" ")
    .trim()
  const countryCode = address.country_code?.trim().toLowerCase()
  const countryLine = countryCode
    ? countryNames.get(countryCode) ?? countryCode.toUpperCase()
    : null

  return [
    name,
    address.company,
    address.address_1,
    address.address_2,
    cityLine,
    countryLine,
  ].filter((line): line is string => Boolean(line))
}

const areOrderAddressesEqual = (
  left?: OrderAddress | null,
  right?: OrderAddress | null
) => {
  const leftLines = getAddressLines(left).map((line) => line.toLowerCase())
  const rightLines = getAddressLines(right).map((line) => line.toLowerCase())

  return (
    leftLines.length > 0 &&
    leftLines.length === rightLines.length &&
    leftLines.every((line, index) => line === rightLines[index])
  )
}

function AddressBlock({
  address,
  title,
}: {
  address?: OrderAddress | null
  title: string
}) {
  const lines = getAddressLines(address)

  if (!lines.length) return null

  return (
    <div className="space-y-2">
      <h3 className="font-medium">{title}</h3>
      <div className="space-y-0.5 text-sm">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  )
}

function SameAddressBlock({ title }: { title: string }) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">Same as shipping address</p>
    </div>
  )
}

export function OrderSummary({ order, className }: OrderSummaryProps) {
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount)
  }

  const getOrderStatus = (order: MedusaOrder) => {
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

  const status = getOrderStatus(order)
  const lifecycle = getOrderLifecycle(order)
  const currencyCode = order.currency_code || "USD"
  const orderDisplayGroups = buildCartDisplayGroups(order.items)
  const orderAnalysis = analyzeCartContents(order.items, currencyCode)
  const orderTotals = order as MedusaOrder & {
    billing_address?: OrderAddress | null
    item_subtotal?: number | null
    shipping_subtotal?: number | null
  }
  const shippingAddress = order.shipping_address as OrderAddress | null | undefined
  const billingAddress = orderTotals.billing_address
  const billingMatchesShipping = areOrderAddressesEqual(
    shippingAddress,
    billingAddress
  )
  const orderNumber = getCustomerOrderNumber(order)
  const discountTotal =
    typeof order.discount_total === "number" ? order.discount_total : 0
  const shippingTotal =
    typeof order.shipping_total === "number"
      ? order.shipping_total
      : typeof orderTotals.shipping_subtotal === "number"
        ? orderTotals.shipping_subtotal
        : null
  const displayedSubtotal =
    shippingTotal !== null && typeof order.total === "number"
      ? Math.max(0, order.total - shippingTotal + discountTotal)
      : orderTotals.item_subtotal ?? order.subtotal ?? 0

  const formatAvailabilityDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const renderItem = (
    item: NonNullable<MedusaOrder["items"]>[number],
    key: string
  ) => {
    const preorderItem = item as MedusaOrderLineItemWithPreorder
    const preorderPrice = resolvePreorderPrice(preorderItem.variant, currencyCode)
    const displayCurrency = preorderPrice?.currency_code || currencyCode
    const quantity = item.quantity || 0
    const unitPrice = preorderPrice?.amount ?? item.unit_price ?? 0
    const totalPrice =
      typeof item.total === "number"
        ? item.total
        : typeof item.subtotal === "number"
          ? toCustomerPriceAmount(item.subtotal, displayCurrency)
          : toCustomerPriceAmount(unitPrice * quantity, displayCurrency)
    const regularUnitPrice = resolveCartLineRegularUnitPrice(item, currencyCode)
    const regularLineTotal =
      typeof regularUnitPrice === "number" && regularUnitPrice > unitPrice
        ? regularUnitPrice * quantity
        : null
    const variantTitle = getCartItemVariantTitle(item)

    return (
      <div
        key={key}
        className="flex items-start justify-between gap-4"
      >
        <div className="flex-1">
          <p className="text-sm font-medium">{item.title}</p>
          {variantTitle ? (
            <p className="text-xs text-muted-foreground">{variantTitle}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Qty {quantity} x {formatCustomerPrice(unitPrice, displayCurrency)}
          </p>
          {isPreorder(preorderItem.variant?.preorder_variant) && (
            <p className="text-xs text-primary">
              Pre-order available on{" "}
              {new Date(preorderItem.variant!.preorder_variant!.available_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-mono text-sm">
            {formatPrice(totalPrice, displayCurrency)}
          </p>
          {regularLineTotal ? (
            <p className="font-mono text-xs text-muted-foreground line-through">
              {formatCustomerPrice(regularLineTotal, currencyCode)}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  const getBundleLineTotal = (
    items: NonNullable<MedusaOrder["items"]>
  ): number =>
    items.reduce((sum, item) => {
      const quantity = item.quantity || 0
      const unitPrice = item.unit_price ?? 0
      const lineTotal =
        typeof item.total === "number"
          ? item.total
          : typeof item.subtotal === "number"
            ? item.subtotal
            : unitPrice * quantity

      return sum + lineTotal
    }, 0)

  const getBundleChildLabel = (
    item: NonNullable<MedusaOrder["items"]>[number]
  ) => {
    const variantTitle = getCartItemVariantTitle(item)

    return `${item.quantity || 0} x ${item.title}${
      variantTitle ? ` - ${variantTitle}` : ""
    }`
  }

  const renderBundleGroup = (
    group: Extract<(typeof orderDisplayGroups)[number], { type: "bundle" }>
  ) => {
    const lineTotal = getBundleLineTotal(group.items)
    const bundleUnitPrice =
      group.quantity > 0 ? lineTotal / group.quantity : lineTotal

    return (
      <details
        key={group.bundleId}
        className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4"
      >
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium">
              {group.bundleTitle ?? "Product Bundle"}
            </p>
            <p className="text-xs text-muted-foreground">
              Qty {group.quantity} x {formatCustomerPrice(bundleUnitPrice, currencyCode)}
            </p>
            <p className="mt-1 text-xs text-primary">View included items</p>
          </div>
          <p className="font-mono text-sm">
            {formatCustomerPrice(lineTotal, currencyCode)}
          </p>
        </summary>
        <div className="mt-3 border-t border-primary/20 pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Includes
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {group.items.map((item, groupIndex) => (
              <li key={`${group.bundleId}-${item.id || groupIndex}`}>
                {getBundleChildLabel(item)}
              </li>
            ))}
          </ul>
        </div>
      </details>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Order Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Order Number</p>
          <p className="font-mono text-sm font-medium">{orderNumber}</p>
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
          Payment: {getSafePaymentMethodDisplay(order)}
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium bg-card">
          Fulfillment: {lifecycle.label}
        </div>
      </div>

      <Separator />

      {/* Order Items */}
      <div className="space-y-4">
        <h3 className="font-medium">Items</h3>
        {orderAnalysis.hasPreorderItems ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
            Some items in this order are pre-ordered and will ship when available.
            {orderAnalysis.earliestPreorderDate ? (
              <> Earliest estimated availability: {formatAvailabilityDate(orderAnalysis.earliestPreorderDate)}.</>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-3">
          {orderDisplayGroups.map((group, index) =>
            group.type === "bundle" ? (
              renderBundleGroup(group)
            ) : (
              renderItem(group.item, group.item.id || String(index))
            )
          )}
        </div>
      </div>

      <Separator />

      {/* Addresses */}
      {(shippingAddress || billingAddress) && (
        <div className="grid gap-6 md:grid-cols-2">
          <AddressBlock
            title="Shipping Address"
            address={shippingAddress}
          />
          {billingMatchesShipping ? (
            <SameAddressBlock title="Billing Address" />
          ) : (
            <AddressBlock
              title="Billing Address"
              address={billingAddress}
            />
          )}
        </div>
      )}

      <Separator />

      <OrderTotalsSummary
        currencyCode={currencyCode}
        discountTotal={discountTotal}
        shippingLabel="Not charged"
        shippingTotal={(shippingTotal || 0) > 0 ? shippingTotal : null}
        subtotal={displayedSubtotal}
        taxTotal={order.tax_total ?? 0}
        total={order.total || 0}
      />
    </div>
  )
}
