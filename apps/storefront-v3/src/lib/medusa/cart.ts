import { sdk } from "./client"
import { StoreCart } from "@medusajs/types"

export async function createCart(regionId?: string): Promise<StoreCart> {
  const { cart } = await sdk.store.cart.create({
    region_id: regionId,
  })
  return cart
}

export async function getCart(cartId: string): Promise<StoreCart> {
  const { cart } = await sdk.store.cart.retrieve(cartId, {
    fields: "*items,*items.variant,*items.variant.product,*region,*total,*subtotal,*tax_total,*discount_total,*shipping_total",
  })
  return cart
}

export async function addToCart({
  cartId,
  variantId,
  quantity,
}: {
  cartId: string
  variantId: string
  quantity: number
}): Promise<StoreCart> {
  const { cart } = await sdk.store.cart.createLineItem(cartId, {
    variant_id: variantId,
    quantity,
  })
  return cart
}

export async function updateLineItem({
  cartId,
  lineItemId,
  quantity,
}: {
  cartId: string
  lineItemId: string
  quantity: number
}): Promise<StoreCart> {
  const { cart } = await sdk.store.cart.updateLineItem(cartId, lineItemId, {
    quantity,
  })
  return cart
}

export async function deleteLineItem({
  cartId,
  lineItemId,
}: {
  cartId: string
  lineItemId: string
}): Promise<StoreCart> {
  await sdk.store.cart.deleteLineItem(cartId, lineItemId)
  // Re-fetch the cart to get the updated state
  return getCart(cartId)
}

export async function updateCart({
  cartId,
  data,
}: {
  cartId: string
  data: {
    email?: string
    shipping_address?: any
    billing_address?: any
  }
}): Promise<StoreCart> {
  const { cart } = await sdk.store.cart.update(cartId, data)
  return cart
}

export async function addShippingMethod({
  cartId,
  optionId,
}: {
  cartId: string
  optionId: string
}): Promise<StoreCart> {
  const { cart } = await sdk.store.cart.addShippingMethod(cartId, {
    option_id: optionId,
  })
  return cart
}

export async function completeCart(cartId: string): Promise<any> {
  return await sdk.store.cart.complete(cartId)
}

export async function initiatePaymentSession({
  cart,
  providerId,
}: {
  cart: StoreCart
  providerId: string
}): Promise<any> {
  // @ts-ignore - The SDK types might be slightly off or we need to access differently
  // based on Source 1: sdk.store.payment.initiatePaymentSession(cart, { provider_id })
  return await sdk.store.payment.initiatePaymentSession(cart, {
    provider_id: providerId,
  })
}
