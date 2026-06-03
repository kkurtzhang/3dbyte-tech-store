import { NextResponse } from "next/server"

import {
  GOOGLE_OAUTH_REDIRECT_COOKIE,
  getGoogleOAuthRedirectCookieOptions,
} from "@/lib/auth/session-cookies"
import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url"

import {
  buildStorefrontRedirect,
  getPublishableApiHeaders,
  getSafeRedirectPath,
  readJsonResponse,
  setCustomerSessionCookies,
} from "../_lib"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const medusaBaseUrl = resolveMedusaBaseUrl({ isServer: true })
  const callbackUrl = buildStorefrontRedirect(
    requestUrl,
    "/auth/google/callback"
  ).toString()
  const failureRedirect = buildStorefrontRedirect(
    requestUrl,
    "/sign-in?error=google_oauth_unavailable"
  )

  try {
    const medusaResponse = await fetch(`${medusaBaseUrl}/auth/customer/google`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...getPublishableApiHeaders(),
      },
      body: JSON.stringify({
        callback_url: callbackUrl,
      }),
      cache: "no-store",
    })
    const data = await readJsonResponse(medusaResponse)

    if (!medusaResponse.ok) {
      throw new Error("Google OAuth start failed")
    }

    if (typeof data.token === "string") {
      const redirectPath =
        getSafeRedirectPath(requestUrl.searchParams.get("redirect")) ||
        "/account"
      const response = NextResponse.redirect(
        buildStorefrontRedirect(requestUrl, redirectPath)
      )
      setCustomerSessionCookies(response, data.token)
      return response
    }

    if (typeof data.location !== "string") {
      throw new Error("Google OAuth location missing")
    }

    const response = NextResponse.redirect(data.location)
    const redirectPath = getSafeRedirectPath(
      requestUrl.searchParams.get("redirect")
    )

    if (redirectPath) {
      response.cookies.set(
        GOOGLE_OAUTH_REDIRECT_COOKIE,
        redirectPath,
        getGoogleOAuthRedirectCookieOptions()
      )
    }

    return response
  } catch (error) {
    console.error("Google OAuth start error:", error)
    return NextResponse.redirect(failureRedirect)
  }
}
