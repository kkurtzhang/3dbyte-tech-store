"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { updateCart, addShippingMethod, completeCart, initiatePaymentSession, getCart, getShippingOptions } from "@/lib/medusa/cart"
import { z } from "zod"

const CART_COOKIE = "_medusa_cart_id"
const checkoutAddressSchema = z.object({
  email: z.string().email(),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  address_1: z.string().trim().min(1).max(200),
  address_2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(100),
  country_code: z.string().trim().length(2),
  postal_code: z.string().trim().min(1).max(20),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
})

export async function getShippingOptionsAction() {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, error: "No cart found", options: [] }

  try {
    const options = await getShippingOptions(cartId)
    return { success: true, options }
  } catch (error: any) {
    console.error("Get shipping options error:", error)
    return { success: false, error: error.message, options: [] }
  }
}

export async function initPaymentSessionAction() {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, error: "No cart found" }

  try {
    // We need the full cart object to pass to initiatePaymentSession
    const cart = await getCart(cartId)

    // Initialize payment session for Stripe
    // In Medusa v2, we initiate a session for a specific provider
    const paymentCollection = await initiatePaymentSession({
      cart,
      providerId: "stripe"
    })

    revalidatePath("/checkout")
    return { success: true, paymentCollection }
  } catch (error: any) {
    console.error("Init payment session error:", error)
    return { success: false, error: error.message || "Failed to init payment session" }
  }
}

export async function setAddressesAction(data: unknown) {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, error: "No cart found" }

  try {
    const parsed = checkoutAddressSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: "Invalid address information" }
    }
    const address = parsed.data

    const cart = await updateCart({
      cartId,
      data: {
        email: address.email,
        shipping_address: {
          first_name: address.first_name,
          last_name: address.last_name,
          address_1: address.address_1,
          address_2: address.address_2,
          city: address.city,
          country_code: address.country_code.toLowerCase(),
          postal_code: address.postal_code,
          phone: address.phone,
        },
        billing_address: {
          first_name: address.first_name,
          last_name: address.last_name,
          address_1: address.address_1,
          address_2: address.address_2,
          city: address.city,
          country_code: address.country_code.toLowerCase(),
          postal_code: address.postal_code,
          phone: address.phone,
        }
      }
    })
    revalidatePath("/checkout")
    return { success: true, cart }
  } catch (error: any) {
    console.error("Set address error:", error)
    return { success: false, error: error.message || "Failed to set address" }
  }
}

export async function setShippingMethodAction(optionId: string) {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, error: "No cart found" }
  if (!optionId?.trim()) return { success: false, error: "Invalid shipping option" }

  try {
    const cart = await addShippingMethod({ cartId, optionId })
    revalidatePath("/checkout")
    return { success: true, cart }
  } catch (error: any) {
    console.error("Set shipping method error:", error)
    return { success: false, error: error.message || "Failed to set shipping method" }
  }
}

export async function completeCartAction() {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, error: "No cart found" }

  try {
    const order = await completeCart(cartId)
    cookieStore.delete(CART_COOKIE)
    return { success: true, order }
  } catch (error: any) {
    console.error("Complete cart error:", error)
    return { success: false, error: error.message || "Failed to complete order" }
  }
}
