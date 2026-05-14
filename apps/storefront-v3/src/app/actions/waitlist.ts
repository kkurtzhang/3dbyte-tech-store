"use server"

import { revalidatePath } from "next/cache"
import { getCustomerAuthHeaders } from "@/app/actions/auth"
import { sdk } from "@/lib/medusa/client"
import type {
  InventoryAlert,
  WaitlistItemInput,
  WaitlistMutationResult,
} from "@/lib/waitlist/types"

type ServerWaitlistRow = {
  id: string
  customer_email?: string | null
  product_id: string
  product_variant_id?: string | null
  product_handle: string
  product_title: string
  variant_title?: string | null
  created_at?: string
  notified?: boolean
}

type WaitlistReadResult =
  | {
      success: true
      customerEmail: string
      waitlist: InventoryAlert[]
    }
  | {
      success: false
      error: string
      requiresAuth?: boolean
    }

type WaitlistAddResult =
  | {
      success: true
      item: InventoryAlert
    }
  | {
      success: false
      error: string
      requiresAuth?: boolean
    }

const authRequired = {
  success: false as const,
  requiresAuth: true,
  error: "Sign in to manage your waitlist.",
}

function mapWaitlistRow(row: ServerWaitlistRow): InventoryAlert {
  return {
    id: row.product_id,
    waitlistId: row.id,
    productId: row.product_id,
    productHandle: row.product_handle,
    productTitle: row.product_title,
    variantId: row.product_variant_id ?? "",
    variantTitle: row.variant_title ?? "",
    email: row.customer_email ?? "",
    createdAt: row.created_at ?? new Date().toISOString(),
    notified: row.notified ?? false,
  }
}

export async function getWaitlistAction(): Promise<WaitlistReadResult> {
  const authHeaders = await getCustomerAuthHeaders()
  if (!authHeaders) {
    return authRequired
  }

  try {
    const response = await sdk.client.fetch<{
      customer_email?: string | null
      waitlist: ServerWaitlistRow[]
    }>("/store/waitlist", {
      method: "GET",
      headers: authHeaders,
    })

    return {
      success: true,
      customerEmail: response.customer_email ?? "",
      waitlist: response.waitlist.map(mapWaitlistRow),
    }
  } catch (error: any) {
    console.error("Get waitlist error:", error)
    return {
      success: false,
      error: error.message || "Failed to load waitlist.",
    }
  }
}

export async function addWaitlistItemAction(
  item: WaitlistItemInput
): Promise<WaitlistAddResult> {
  const authHeaders = await getCustomerAuthHeaders()

  try {
    const response = await sdk.client.fetch<{ waitlist: ServerWaitlistRow }>(
      "/store/waitlist",
      {
        method: "POST",
        body: {
          ...(item.email ? { email: item.email } : {}),
          product_id: item.productId,
          product_variant_id: item.variantId,
          product_handle: item.productHandle,
          product_title: item.productTitle,
          variant_title: item.variantTitle,
        },
        headers: authHeaders || undefined,
      }
    )

    if (authHeaders) {
      revalidatePath("/waitlist")
    }

    return {
      success: true,
      item: mapWaitlistRow({
        ...response.waitlist,
        customer_email: response.waitlist.customer_email ?? item.email ?? "",
        product_id: response.waitlist.product_id ?? item.productId,
        product_variant_id:
          response.waitlist.product_variant_id ?? item.variantId ?? "",
        product_handle: response.waitlist.product_handle ?? item.productHandle,
        product_title: response.waitlist.product_title ?? item.productTitle,
        variant_title: response.waitlist.variant_title ?? item.variantTitle ?? "",
      }),
    }
  } catch (error: any) {
    console.error("Add waitlist item error:", error)
    return {
      success: false,
      error: error.message || "Failed to add item to waitlist.",
    }
  }
}

export async function removeWaitlistItemAction(
  waitlistId: string
): Promise<WaitlistMutationResult> {
  const authHeaders = await getCustomerAuthHeaders()
  if (!authHeaders) {
    return authRequired
  }

  try {
    await sdk.client.fetch(`/store/waitlist/${waitlistId}`, {
      method: "DELETE",
      headers: authHeaders,
    })
    revalidatePath("/waitlist")

    return { success: true }
  } catch (error: any) {
    console.error("Remove waitlist item error:", error)
    return {
      success: false,
      error: error.message || "Failed to remove item from waitlist.",
    }
  }
}

export async function clearWaitlistAction(): Promise<WaitlistMutationResult> {
  const authHeaders = await getCustomerAuthHeaders()
  if (!authHeaders) {
    return authRequired
  }

  try {
    await sdk.client.fetch("/store/waitlist", {
      method: "DELETE",
      headers: authHeaders,
    })
    revalidatePath("/waitlist")

    return { success: true }
  } catch (error: any) {
    console.error("Clear waitlist error:", error)
    return {
      success: false,
      error: error.message || "Failed to clear waitlist.",
    }
  }
}
