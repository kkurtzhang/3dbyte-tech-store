"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createCart, getCart, addToCart } from "@/lib/medusa/cart"
import { sdk } from "@/lib/medusa/client"

const CART_COOKIE = "_medusa_cart_id"

interface ReorderItem {
  variantId: string
  quantity: number
  productTitle: string
  variantTitle: string
}

interface ReorderResult {
  success: boolean
  addedItems: string[]
  outOfStockItems: ReorderItem[]
  errors: string[]
}

/**
 * Fetch order items with variant information for reordering
 */
export async function getOrderItemsAction(orderId: string): Promise<{
  items: Array<{
    variantId: string
    productId: string
    productTitle: string
    variantTitle: string
    quantity: number
    thumbnail?: string
  }>
}> {
  try {
    // Fetch order with items and variant info
    const { order } = await sdk.store.order.retrieve(orderId, {
      fields: "items,items.variant,items.variant.product,items.variant.prices",
    })

    if (!order?.items) {
      return { items: [] }
    }

    const items = order.items.map((item: any) => ({
      variantId: item.variant_id || item.variant?.id,
      productId: item.product_id || item.variant?.product_id || item.variant?.product?.id,
      productTitle: item.title || item.product_title || item.variant?.product?.title || "Product",
      variantTitle: item.variant?.title || "",
      quantity: item.quantity,
      thumbnail: item.thumbnail || item.variant?.product?.thumbnail || item.variant?.product?.images?.[0]?.url,
    }))

    return { items }
  } catch (error) {
    console.error("Failed to fetch order items:", error)
    return { items: [] }
  }
}

/**
 * Add all order items to cart
 */
export async function reorderAction(orderId: string): Promise<ReorderResult> {
  const cookieStore = await cookies()
  
  try {
    // Fetch order items
    const { items: orderItems } = await getOrderItemsAction(orderId)
    
    if (orderItems.length === 0) {
      return {
        success: false,
        addedItems: [],
        outOfStockItems: [],
        errors: ["No items found in this order"],
      }
    }

    // Get or create cart
    let cartId = cookieStore.get(CART_COOKIE)?.value
    
    if (!cartId) {
      const cart = await createCart()
      cartId = cart.id
      cookieStore.set(CART_COOKIE, cartId)
    }

    const addedItems: string[] = []
    const outOfStockItems: ReorderItem[] = []
    const errors: string[] = []

    // Try to add each item to cart
    for (const item of orderItems) {
      if (!item.variantId) {
        errors.push(`Could not find variant for "${item.productTitle}"`)
        continue
      }

      try {
        // Add item to cart
        await addToCart({
          cartId,
          variantId: item.variantId,
          quantity: item.quantity,
        })
        
        // Item was added successfully
        addedItems.push(item.productTitle)
      } catch (error: any) {
        // If error indicates out of stock or not available
        const errorMsg = error.message?.toLowerCase() || ""
        if (errorMsg.includes("inventory") || errorMsg.includes("stock") || 
            errorMsg.includes("unavailable") || errorMsg.includes("insufficient") ||
            error.response?.status === 400 || error.response?.status === 404) {
          outOfStockItems.push({
            variantId: item.variantId,
            quantity: item.quantity,
            productTitle: item.productTitle,
            variantTitle: item.variantTitle,
          })
        } else {
          errors.push(`Failed to add "${item.productTitle}": ${error.message || "Unknown error"}`)
        }
      }
    }

    revalidatePath("/cart")
    revalidatePath("/account/orders")

    return {
      success: addedItems.length > 0,
      addedItems,
      outOfStockItems,
      errors,
    }
  } catch (error: any) {
    console.error("Reorder error:", error)
    return {
      success: false,
      addedItems: [],
      outOfStockItems: [],
      errors: [error.message || "Failed to reorder"],
    }
  }
}
