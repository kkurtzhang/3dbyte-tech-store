"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { updateCart, addShippingMethod, completeCart, initiatePaymentSession, getCart, getShippingOptions } from "@/lib/medusa/cart"

const CART_COOKIE = "_medusa_cart_id"

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

export async function setAddressesAction(data: any) {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, error: "No cart found" }

  try {
    const cart = await updateCart({
      cartId,
      data: {
        email: data.email,
        shipping_address: {
          first_name: data.first_name,
          last_name: data.last_name,
          address_1: data.address_1,
          address_2: data.address_2,
          city: data.city,
          country_code: data.country_code,
          postal_code: data.postal_code,
          phone: data.phone,
        },
        billing_address: {
          first_name: data.first_name,
          last_name: data.last_name,
          address_1: data.address_1,
          address_2: data.address_2,
          city: data.city,
          country_code: data.country_code,
          postal_code: data.postal_code,
          phone: data.phone,
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
