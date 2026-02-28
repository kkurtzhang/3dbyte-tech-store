"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createCart, getCart, addToCart, updateLineItem, deleteLineItem, addLineItems } from "@/lib/medusa/cart"
import { StoreCart } from "@medusajs/types"
import { z } from "zod"

const CART_COOKIE = "_medusa_cart_id"
const lineItemSchema = z.object({
  variantId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(100),
})

export async function getCartAction(): Promise<StoreCart | null> {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return null

  try {
    const cart = await getCart(cartId)
    return cart
  } catch (e) {
    // If cart not found (e.g. deleted on backend), clear cookie
    cookieStore.delete(CART_COOKIE)
    return null
  }
}

export async function addToCartAction(variantId: string, quantity: number) {
  const parsed = lineItemSchema.safeParse({ variantId, quantity })
  if (!parsed.success) {
    return { success: false, error: "Invalid cart item payload" }
  }

  const cookieStore = await cookies()
  let cartId = cookieStore.get(CART_COOKIE)?.value

  try {
    if (!cartId) {
      const cart = await createCart()
      cartId = cart.id
      cookieStore.set(CART_COOKIE, cartId)
    }

    const cart = await addToCart({ cartId, variantId: parsed.data.variantId, quantity: parsed.data.quantity })
    revalidatePath("/cart")
    revalidatePath("/") // Revalidate generic paths if needed
    return { success: true, cart }
  } catch (error: any) {
    console.error("Add to cart error:", error)
    return { success: false, error: error.message || "Failed to add item" }
  }
}

export async function addMultipleToCartAction(items: { variantId: string; quantity: number }[]) {
  const parsed = z.array(lineItemSchema).min(1).max(20).safeParse(items)
  if (!parsed.success) {
    return { success: false, error: "Invalid cart items payload" }
  }

  const cookieStore = await cookies()
  let cartId = cookieStore.get(CART_COOKIE)?.value

  try {
    if (!cartId) {
      const cart = await createCart()
      cartId = cart.id
      cookieStore.set(CART_COOKIE, cartId)
    }

    const cart = await addLineItems({ 
      cartId, 
      items: parsed.data.map(item => ({ variant_id: item.variantId, quantity: item.quantity })) 
    })
    revalidatePath("/cart")
    revalidatePath("/")
    return { success: true, cart }
  } catch (error: any) {
    console.error("Add multiple to cart error:", error)
    return { success: false, error: error.message || "Failed to add items" }
  }
}

export async function updateLineItemAction(lineItemId: string, quantity: number) {
  if (!lineItemId?.trim() || quantity < 1 || quantity > 100) {
    return { success: false, error: "Invalid update payload" }
  }

  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, error: "No cart found" }

  try {
    const cart = await updateLineItem({ cartId, lineItemId, quantity })
    revalidatePath("/cart")
    return { success: true, cart }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update item" }
  }
}

export async function deleteLineItemAction(lineItemId: string) {
  if (!lineItemId?.trim()) {
    return { success: false, error: "Invalid line item id" }
  }

  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, error: "No cart found" }

  try {
    const cart = await deleteLineItem({ cartId, lineItemId })
    revalidatePath("/cart")
    return { success: true, cart }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete item" }
  }
}
