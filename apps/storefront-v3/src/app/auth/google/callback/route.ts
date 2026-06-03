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

      await createGoogleCustomer({
        medusaBaseUrl,
        token: callbackToken,
        email,
      })
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
