"use server"

import { redirect } from "next/navigation"

import { sdk } from "@/lib/medusa/client"

export async function removeManagedWaitlistItemAction(token: string) {
  if (!token) {
    return {
      success: false,
      error: "Missing waitlist management token.",
    }
  }

  try {
    await sdk.client.fetch(
      `/store/waitlist/manage/${encodeURIComponent(token)}`,
      {
        method: "DELETE",
      }
    )
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Unable to update this waitlist notification.",
    }
  }

  redirect("/waitlist/manage?removed=1")
}
