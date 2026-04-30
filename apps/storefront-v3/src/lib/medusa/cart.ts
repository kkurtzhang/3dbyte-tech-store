import { sdk } from "./client"
import type { MedusaCart, MedusaCartLineItem, MedusaOrder } from "./types"
export type { MedusaCart, MedusaCartLineItem } from "./types"
export type BundleCartSelection = {
  item_id: string
  variant_id: string
}

export async function createCart(regionId?: string): Promise<MedusaCart> {
  const { cart } = await sdk.store.cart.create({
    region_id: regionId,
  })
  return cart
}

export async function getCart(cartId: string): Promise<MedusaCart> {
  const { cart } = await sdk.store.cart.retrieve(cartId, {
    fields:
      "+items.*,+items.metadata,+items.product,+items.variant,+items.variant.product,+items.variant.product.images,*items.variant.preorder_variant,*items.variant.preorder_variant.prices,+region,*promotions",
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
}): Promise<MedusaCart> {
  await sdk.client.fetch<{ cart: MedusaCart }>(
    `/store/carts/${cartId}/line-items-priced`,
    {
      method: "POST",
      body: {
        variant_id: variantId,
        quantity,
      },
    }
  )

  return getCart(cartId)
}

export async function addLineItems({
  cartId,
  items,
}: {
  cartId: string
  items: { variant_id: string; quantity: number }[]
}): Promise<MedusaCart> {
  let cart = await getCart(cartId)

  for (const item of items) {
    cart = await addToCart({
      cartId,
      variantId: item.variant_id,
      quantity: item.quantity,
    })
  }

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
}): Promise<MedusaCart> {
  await sdk.store.cart.updateLineItem(cartId, lineItemId, {
    quantity,
  })
  return getCart(cartId)
}

export async function deleteLineItem({
  cartId,
  lineItemId,
}: {
  cartId: string
  lineItemId: string
}): Promise<MedusaCart> {
  await sdk.store.cart.deleteLineItem(cartId, lineItemId)
  // Re-fetch the cart to get the updated state
  return getCart(cartId)
}

export async function addBundleToCart({
  cartId,
  bundleId,
  quantity,
  items,
}: {
  cartId: string
  bundleId: string
  quantity: number
  items: BundleCartSelection[]
}): Promise<MedusaCart> {
  await sdk.client.fetch<{ cart: MedusaCart }>(
    `/store/carts/${cartId}/line-item-bundles`,
    {
      method: "POST",
      body: {
        bundle_id: bundleId,
        quantity,
        items,
      },
    }
  )

  return getCart(cartId)
}

export async function removeBundleFromCart({
  cartId,
  bundleId,
}: {
  cartId: string
  bundleId: string
}): Promise<MedusaCart> {
  await sdk.client.fetch<{ cart: MedusaCart }>(
    `/store/carts/${cartId}/line-item-bundles/${bundleId}`,
    {
      method: "DELETE",
    }
  )

  return getCart(cartId)
}

export async function updateBundleInCart({
  cartId,
  bundleId,
  quantity,
}: {
  cartId: string
  bundleId: string
  quantity: number
}): Promise<MedusaCart> {
  await sdk.client.fetch<{ cart: MedusaCart }>(
    `/store/carts/${cartId}/line-item-bundles/${bundleId}`,
    {
      method: "PUT",
      body: {
        quantity,
      },
    }
  )

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
}): Promise<MedusaCart> {
  const { cart } = await sdk.store.cart.update(cartId, data)
  return cart
}

export async function addShippingMethod({
  cartId,
  data,
  optionId,
}: {
  cartId: string
  data?: Record<string, unknown>
  optionId: string
}): Promise<MedusaCart> {
  const { cart } = await sdk.store.cart.addShippingMethod(cartId, {
    option_id: optionId,
    ...(data ? { data } : {}),
  })
  return cart
}

export async function completePreorderCart(cartId: string): Promise<MedusaOrder> {
  const response = await sdk.client.fetch<{ type: "order"; order: MedusaOrder }>(
    `/store/carts/${cartId}/complete-preorder`,
    {
      method: "POST",
    }
  )

  return response.order
}

export async function completeCart(cartId: string): Promise<MedusaOrder> {
  return completePreorderCart(cartId)
}

export async function initiatePaymentSession({
  cart,
  providerId,
}: {
  cart: MedusaCart
  providerId: string
}): Promise<any> {
  return await sdk.store.payment.initiatePaymentSession(cart, {
    provider_id: providerId,
  })
}

export async function getShippingOptions(cartId: string): Promise<any[]> {
  try {
    const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
      cart_id: cartId,
    })
    return shipping_options || []
  } catch {
    return []
  }
}

export async function calculateShippingOption({
  cartId,
  data,
  optionId,
}: {
  cartId: string
  data?: Record<string, unknown>
  optionId: string
}): Promise<number | null> {
  const result = (await sdk.store.fulfillment.calculate(optionId, {
    cart_id: cartId,
    ...(data ? { data } : {}),
  })) as {
    shipping_option?: {
      amount?: number | null
      calculated_price?: {
        calculated_amount?: number | null
      }
    }
  }

  const calculatedAmount =
    result.shipping_option?.calculated_price?.calculated_amount
  if (typeof calculatedAmount === "number") {
    return calculatedAmount
  }

  const amount = result.shipping_option?.amount
  return typeof amount === "number" ? amount : null
}
