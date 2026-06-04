import { NextResponse } from "next/server"

import { GOOGLE_OAUTH_REDIRECT_COOKIE } from "@/lib/auth/session-cookies"
import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url"

import {
  buildStorefrontRedirect,
  decodeJwtPayload,
  getCookieValue,
  getPublishableApiHeaders,
  getSafeRedirectPath,
  readJsonResponse,
  setCustomerSessionCookies,
} from "../_lib"

export const dynamic = "force-dynamic"

const CART_COOKIE = "_medusa_cart_id"

async function createGoogleCustomer({
  medusaBaseUrl,
  token,
  email,
}: {
  medusaBaseUrl: string
  token: string
  email: string
}) {
  const response = await fetch(`${medusaBaseUrl}/store/customers`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
      ...getPublishableApiHeaders(),
    },
    body: JSON.stringify({ email }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to create Google customer")
  }
}

async function claimGoogleCustomerAccount({
  medusaBaseUrl,
  token,
  email,
}: {
  medusaBaseUrl: string
  token: string
  email: string
}) {
  const response = await fetch(`${medusaBaseUrl}/store/customers/claim-account`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
      ...getPublishableApiHeaders(),
    },
    body: JSON.stringify({ email, source: "google" }),
    cache: "no-store",
  })

  if (response.status === 404) {
    return false
  }

  if (!response.ok) {
    throw new Error("Failed to claim Google customer account")
  }

  return true
}

async function refreshCustomerToken({
  medusaBaseUrl,
  token,
}: {
  medusaBaseUrl: string
  token: string
}) {
  const response = await fetch(`${medusaBaseUrl}/auth/token/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...getPublishableApiHeaders(),
    },
    cache: "no-store",
  })
  const data = await readJsonResponse(response)

  if (!response.ok || typeof data.token !== "string") {
    throw new Error("Failed to refresh Google customer token")
  }

  return data.token as string
}

async function linkGoogleCustomerContext({
  medusaBaseUrl,
  token,
  cookieHeader,
}: {
  medusaBaseUrl: string
  token: string
  cookieHeader: string | null
}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    ...getPublishableApiHeaders(),
  }

  try {
    await fetch(`${medusaBaseUrl}/store/customers/me/link-guest-orders`, {
      method: "POST",
      headers,
      cache: "no-store",
    })
  } catch (error) {
    console.warn("Failed to link Google customer guest orders:", error)
  }

  const cartId = getCookieValue(cookieHeader, CART_COOKIE)

  if (!cartId) {
    return
  }

  try {
    await fetch(
      `${medusaBaseUrl}/store/carts/${encodeURIComponent(cartId)}/customer`,
      {
        method: "POST",
        headers,
        cache: "no-store",
      }
    )
  } catch (error) {
    console.warn("Failed to attach cart after Google login:", error)
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const failureRedirect = buildStorefrontRedirect(
    requestUrl,
    "/sign-in?error=google_oauth_failed"
  )

  if (
    requestUrl.searchParams.get("error") ||
    !requestUrl.searchParams.get("code")
  ) {
    return NextResponse.redirect(failureRedirect)
  }

  try {
    const medusaBaseUrl = resolveMedusaBaseUrl({ isServer: true })
    const callbackUrl = new URL(
      "/auth/customer/google/callback",
      medusaBaseUrl
    )
    callbackUrl.search = requestUrl.search

    const callbackResponse = await fetch(callbackUrl.toString(), {
      method: "POST",
      headers: {
        ...getPublishableApiHeaders(),
      },
      cache: "no-store",
    })
    const callbackData = await readJsonResponse(callbackResponse)

    if (!callbackResponse.ok || typeof callbackData.token !== "string") {
      throw new Error("Google OAuth callback failed")
    }

    const callbackToken = callbackData.token as string
    const decoded = decodeJwtPayload(callbackToken)
    const shouldCreateCustomer = !decoded?.actor_id
    let sessionToken = callbackToken

    if (shouldCreateCustomer) {
      const email = decoded?.user_metadata?.email

      if (typeof email !== "string" || !email.includes("@")) {
        throw new Error("Google OAuth callback did not include an email")
      }

      const claimedAccount = await claimGoogleCustomerAccount({
        medusaBaseUrl,
        token: callbackToken,
        email,
      })

      if (!claimedAccount) {
        await createGoogleCustomer({
          medusaBaseUrl,
          token: callbackToken,
          email,
        })
      }

      sessionToken = await refreshCustomerToken({
        medusaBaseUrl,
        token: callbackToken,
      })
    }

    const redirectPath =
      getSafeRedirectPath(
        getCookieValue(
          request.headers.get("cookie"),
          GOOGLE_OAUTH_REDIRECT_COOKIE
        )
      ) || "/account"
    await linkGoogleCustomerContext({
      medusaBaseUrl,
      token: sessionToken,
      cookieHeader: request.headers.get("cookie"),
    })
    const response = NextResponse.redirect(
      buildStorefrontRedirect(requestUrl, redirectPath)
    )
    setCustomerSessionCookies(response, sessionToken)

    return response
  } catch (error) {
    console.error("Google OAuth callback error:", error)
    return NextResponse.redirect(failureRedirect)
  }
}
