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
