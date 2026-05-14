"use server"

import { revalidatePath } from "next/cache"
import { getCustomerAuthHeaders } from "@/app/actions/auth"
import { sdk } from "@/lib/medusa/client"
import type { WishlistItem, WishlistMutationResult } from "@/lib/wishlist/types"

type ServerWishlistRow = {
  id: string
  product_id: string
  product_variant_id?: string | null
}

type WishlistReadResult =
  | {
      success: true
      wishlist: WishlistItem[]
    }
  | {
      success: false
      error: string
      requiresAuth?: boolean
    }

type WishlistAddResult =
  | {
      success: true
      item: WishlistItem
    }
  | {
      success: false
      error: string
      requiresAuth?: boolean
    }

const authRequired = {
  success: false as const,
  requiresAuth: true,
  error: "Sign in to manage your wishlist.",
}

function getVariantPrice(variant: any) {
  const amount =
    variant?.calculated_price?.calculated_amount ??
    variant?.calculated_price?.original_amount ??
    variant?.prices?.[0]?.amount ??
    0
  const currencyCode =
    variant?.calculated_price?.currency_code ??
    variant?.prices?.[0]?.currency_code ??
    "aud"

  return {
    amount,
    currency_code: currencyCode.toUpperCase(),
  }
}

async function resolveWishlistItem(row: ServerWishlistRow): Promise<WishlistItem> {
  const { products } = await sdk.store.product.list({
    id: [row.product_id],
    limit: 1,
    fields: "*variants,*variants.prices,*variants.calculated_price",
  })
  const product = products[0]

  if (!product) {
    throw new Error(`Product ${row.product_id} was not found`)
  }

  const selectedVariant =
    product.variants?.find((variant) => variant.id === row.product_variant_id) ??
    product.variants?.[0]

  return {
    id: row.product_id,
    wishlistId: row.id,
    handle: product.handle ?? row.product_id,
    title: product.title ?? "Saved product",
    thumbnail: product.thumbnail ?? "",
    price: getVariantPrice(selectedVariant),
    variantId: row.product_variant_id ?? selectedVariant?.id,
  }
}

export async function getWishlistAction(): Promise<WishlistReadResult> {
  const authHeaders = await getCustomerAuthHeaders()
  if (!authHeaders) {
    return authRequired
  }

  try {
    const response = await sdk.client.fetch<{ wishlist: ServerWishlistRow[] }>(
      "/store/wishlist",
      {
        method: "GET",
        headers: authHeaders,
      }
    )
    const wishlist = await Promise.all(response.wishlist.map(resolveWishlistItem))

    return {
      success: true,
      wishlist,
    }
  } catch (error: any) {
    console.error("Get wishlist error:", error)
    return {
      success: false,
      error: error.message || "Failed to load wishlist.",
    }
  }
}

export async function addWishlistItemAction(
  item: WishlistItem
): Promise<WishlistAddResult> {
  const authHeaders = await getCustomerAuthHeaders()
  if (!authHeaders) {
    return authRequired
  }

  try {
    const response = await sdk.client.fetch<{ wishlist: ServerWishlistRow }>(
      "/store/wishlist",
      {
        method: "POST",
        body: {
          product_id: item.id,
          product_variant_id: item.variantId,
        },
        headers: authHeaders,
      }
    )

    revalidatePath("/wishlist")

    return {
      success: true,
      item: {
        ...item,
        wishlistId: response.wishlist.id,
      },
    }
  } catch (error: any) {
    console.error("Add wishlist item error:", error)
    return {
      success: false,
      error: error.message || "Failed to add item to wishlist.",
    }
  }
}

export async function removeWishlistItemAction(
  wishlistId: string
): Promise<WishlistMutationResult> {
  const authHeaders = await getCustomerAuthHeaders()
  if (!authHeaders) {
    return authRequired
  }

  try {
    await sdk.client.fetch(`/store/wishlist/${wishlistId}`, {
      method: "DELETE",
      headers: authHeaders,
    })
    revalidatePath("/wishlist")

    return { success: true }
  } catch (error: any) {
    console.error("Remove wishlist item error:", error)
    return {
      success: false,
      error: error.message || "Failed to remove item from wishlist.",
    }
  }
}

export async function clearWishlistAction(
  wishlistIds: string[]
): Promise<WishlistMutationResult> {
  const authHeaders = await getCustomerAuthHeaders()
  if (!authHeaders) {
    return authRequired
  }

  try {
    await Promise.all(
      wishlistIds.map((id) =>
        sdk.client.fetch(`/store/wishlist/${id}`, {
          method: "DELETE",
          headers: authHeaders,
        })
      )
    )
    revalidatePath("/wishlist")

    return { success: true }
  } catch (error: any) {
    console.error("Clear wishlist error:", error)
    return {
      success: false,
      error: error.message || "Failed to clear wishlist.",
    }
  }
}
