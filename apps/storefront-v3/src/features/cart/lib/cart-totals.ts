import { isCustomerTaxInclusiveCurrency } from "@/lib/pricing/customer-pricing"

type CartTotalsSource = {
  item_subtotal?: number | null
  item_total?: number | null
  item_tax_total?: number | null
  subtotal?: number | null
  total?: number | null
  tax_total?: number | null
  shipping_subtotal?: number | null
  shipping_total?: number | null
  shipping_tax_total?: number | null
}

function finiteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function sumFinite(...values: Array<number | null | undefined>) {
  const numbers = values.map(finiteNumber)
  return numbers.every((value): value is number => value !== null)
    ? numbers.reduce((total, value) => total + value, 0)
    : null
}

export function resolveCartShippingInclTax(cart: CartTotalsSource) {
  return (
    finiteNumber(cart.shipping_total) ??
    sumFinite(cart.shipping_subtotal, cart.shipping_tax_total) ??
    finiteNumber(cart.shipping_subtotal) ??
    0
  )
}

export function resolveCartItemsSubtotalInclTax(
  cart: CartTotalsSource | null | undefined,
  currencyCode: string
) {
  if (!cart) {
    return 0
  }

  if (!isCustomerTaxInclusiveCurrency(currencyCode)) {
    return (
      finiteNumber(cart.item_subtotal) ??
      finiteNumber(cart.subtotal) ??
      Math.max(0, (finiteNumber(cart.total) ?? 0) - resolveCartShippingInclTax(cart))
    )
  }

  return (
    finiteNumber(cart.item_total) ??
    sumFinite(cart.item_subtotal, cart.item_tax_total) ??
    Math.max(0, (finiteNumber(cart.total) ?? 0) - resolveCartShippingInclTax(cart))
  )
}
