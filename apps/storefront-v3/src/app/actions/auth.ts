"use server"

import { cookies } from "next/headers"
import { revalidatePath, redirect } from "next/cache"
import { sdk } from "@/lib/medusa/client"

const SESSION_COOKIE = "_medusa_authenticated"

export interface AuthUser {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}

export async function loginAction(email: string, password: string) {
  try {
    // Attempt to authenticate with Medusa using emailpass provider
    const result = await sdk.auth.login("customer", "emailpass", {
      email,
      password,
    })

    // Check if additional steps required (e.g., OAuth redirect)
    if (typeof result !== "string") {
      return { success: false, error: "Authentication requires additional steps" }
    }

    // Auth successful - SDK automatically stores the token
    // Get current customer session
    const { customer } = await sdk.store.customer.retrieve()

    if (customer) {
      // Store session marker
      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE, "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })

      revalidatePath("/")
      return { success: true, user: customer as unknown as AuthUser }
    }

    return { success: false, error: "Failed to retrieve customer data" }
  } catch (error: any) {
    console.error("Login error:", error)
    return { success: false, error: error.message || "Login failed" }
  }
}

export async function registerAction(email: string, password: string, firstName?: string, lastName?: string) {
  try {
    // Register with Medusa auth
    await sdk.auth.register("customer", "emailpass", {
      email,
      password,
    })

    // Create customer profile with explicit type
    const { customer } = await sdk.store.customer.create(
      {
        email,
        first_name: firstName || "",
        last_name: lastName || "",
      } as any
    )

    if (customer) {
      // Auto-login after registration
      return await loginAction(email, password)
    }

    return { success: false, error: "Registration failed" }
  } catch (error: any) {
    console.error("Registration error:", error)
    return { success: false, error: error.message || "Registration failed" }
  }
}

export async function getSessionAction() {
  try {
    const { customer } = await sdk.store.customer.retrieve()
    
    if (customer) {
      return { success: true, user: customer as unknown as AuthUser }
    }

    return { success: false, error: "No session" }
  } catch (error: any) {
    return { success: false, error: error.message || "Session check failed" }
  }
}

export async function logoutAction() {
  try {
    await sdk.auth.logout()
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
    revalidatePath("/")
    return { success: true }
  } catch (error: any) {
    console.error("Logout error:", error)
    return { success: false, error: error.message || "Logout failed" }
  }
}

export async function updateProfileAction(data: {
  first_name?: string
  last_name?: string
  phone?: string
}) {
  try {
    const { customer } = await sdk.store.customer.update(data as any)
    revalidatePath("/account")
    return { success: true, user: customer as unknown as AuthUser }
  } catch (error: any) {
    console.error("Profile update error:", error)
    return { success: false, error: error.message || "Update failed" }
  }
}

export async function changePasswordAction(token: string, newPassword: string) {
  try {
    await sdk.auth.updateProvider("customer", "emailpass", {
      password: newPassword,
    }, token)
    return { success: true }
  } catch (error: any) {
    console.error("Password change error:", error)
    return { success: false, error: error.message || "Password change failed" }
  }
}

export interface CustomerAddress {
  id: string
  first_name: string
  last_name: string
  address_1: string
  address_2?: string
  city: string
  country_code: string
  postal_code: string
  phone?: string
  is_default?: boolean
}

export async function getAddressesAction(): Promise<{ success: boolean; addresses: CustomerAddress[]; error?: string }> {
  try {
    const { customer } = await sdk.store.customer.retrieve()
    if (customer?.addresses) {
      return { success: true, addresses: customer.addresses as unknown as CustomerAddress[] }
    }
    return { success: true, addresses: [] }
  } catch (error: any) {
    console.error("Get addresses error:", error)
    return { success: false, error: error.message || "Failed to fetch addresses", addresses: [] }
  }
}

export async function addAddressAction(data: {
  first_name: string
  last_name: string
  address_1: string
  address_2?: string
  city: string
  country_code: string
  postal_code: string
  phone?: string
}) {
  try {
    const { customer } = await sdk.store.customer.createAddress(
      data as any
    )
    revalidatePath("/account/addresses")
    return { success: true, customer }
  } catch (error: any) {
    console.error("Add address error:", error)
    return { success: false, error: error.message || "Failed to add address" }
  }
}

export async function updateAddressAction(addressId: string, data: Partial<{
  first_name: string
  last_name: string
  address_1: string
  address_2: string
  city: string
  country_code: string
  postal_code: string
  phone: string
}>) {
  try {
    const { customer } = await sdk.store.customer.updateAddress(
      addressId,
      data as any
    )
    revalidatePath("/account/addresses")
    return { success: true, customer }
  } catch (error: any) {
    console.error("Update address error:", error)
    return { success: false, error: error.message || "Failed to update address" }
  }
}

export async function deleteAddressAction(addressId: string) {
  try {
    await sdk.store.customer.deleteAddress(addressId)
    revalidatePath("/account/addresses")
    return { success: true }
  } catch (error: any) {
    console.error("Delete address error:", error)
    return { success: false, error: error.message || "Failed to delete address" }
  }
}

export async function setDefaultAddressAction(addressId: string) {
  try {
    const { customer } = await sdk.store.customer.updateAddress(
      addressId,
      { is_default: true } as any
    )
    revalidatePath("/account/addresses")
    return { success: true, customer }
  } catch (error: any) {
    console.error("Set default address error:", error)
    return { success: false, error: error.message || "Failed to set default address" }
  }
}

export async function deleteAccountAction() {
  try {
    await sdk.store.customer.delete()
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
    revalidatePath("/", "layout")
    redirect("/")
  } catch (error: any) {
    console.error("Delete account error:", error)
    return { success: false, error: error.message || "Failed to delete account" }
  }
}
