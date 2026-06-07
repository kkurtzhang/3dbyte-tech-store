import { randomBytes } from "node:crypto"

import { NextResponse } from "next/server"

import {
  CUSTOMER_TOKEN_COOKIE,
  GOOGLE_OAUTH_LINK_INTENT_COOKIE,
  GOOGLE_OAUTH_LINK_NONCE_COOKIE,
  GOOGLE_OAUTH_MODE_COOKIE,
  GOOGLE_OAUTH_REDIRECT_COOKIE,
  getGoogleOAuthRedirectCookieOptions,
} from "@/lib/auth/session-cookies"
import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url"

import {
  buildStorefrontRedirect,
  getCookieValue,
  getPublishableApiHeaders,
  getSafeRedirectPath,
  readJsonResponse,
  setCustomerSessionCookies,
} from "../_lib"

export const dynamic = "force-dynamic"

async function createGoogleLinkIntent({
  medusaBaseUrl,
  customerToken,
  nonce,
}: {
  medusaBaseUrl: string
  customerToken: string
  nonce: string
}) {
  const response = await fetch(
    `${medusaBaseUrl}/store/customers/me/google-link-intents`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${customerToken}`,
        ...getPublishableApiHeaders(),
      },
      body: JSON.stringify({ nonce }),
      cache: "no-store",
    }
  )
  const data = await readJsonResponse(response)

  if (!response.ok || typeof data.intent_id !== "string") {
    throw new Error("Google OAuth link intent creation failed")
  }

  return data.intent_id as string
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const medusaBaseUrl = resolveMedusaBaseUrl({ isServer: true })
  const isLinkMode = requestUrl.searchParams.get("mode") === "link"
  let linkIntentId: string | null = null
  let linkNonce: string | null = null
  const callbackUrl = buildStorefrontRedirect(
    requestUrl,
    "/auth/google/callback"
  ).toString()
  const failureRedirect = buildStorefrontRedirect(
    requestUrl,
    "/sign-in?error=google_oauth_unavailable"
  )

  try {
    if (isLinkMode) {
      const customerToken = getCookieValue(
        request.headers.get("cookie"),
        CUSTOMER_TOKEN_COOKIE
      )

      if (!customerToken) {
        throw new Error("Authenticated customer session required")
      }

      linkNonce = randomBytes(32).toString("base64url")
      linkIntentId = await createGoogleLinkIntent({
        medusaBaseUrl,
        customerToken,
        nonce: linkNonce,
      })
    }

    const medusaResponse = await fetch(
      `${medusaBaseUrl}/auth/customer/google`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...getPublishableApiHeaders(),
        },
        body: JSON.stringify({
          callback_url: callbackUrl,
        }),
        cache: "no-store",
      }
    )
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

    if (isLinkMode) {
      response.cookies.set(
        GOOGLE_OAUTH_MODE_COOKIE,
        "link",
        getGoogleOAuthRedirectCookieOptions()
      )
      response.cookies.set(
        GOOGLE_OAUTH_LINK_INTENT_COOKIE,
        linkIntentId as string,
        getGoogleOAuthRedirectCookieOptions()
      )
      response.cookies.set(
        GOOGLE_OAUTH_LINK_NONCE_COOKIE,
        linkNonce as string,
        getGoogleOAuthRedirectCookieOptions()
      )
    }

    return response
  } catch (error) {
    console.error("Google OAuth start error:", error)
    return NextResponse.redirect(failureRedirect)
  }
}
