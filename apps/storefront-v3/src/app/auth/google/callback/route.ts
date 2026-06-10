import { NextResponse } from "next/server"

import {
  CUSTOMER_ACCOUNT_REAUTH_COOKIE,
  GOOGLE_OAUTH_LINK_INTENT_COOKIE,
  GOOGLE_OAUTH_LINK_NONCE_COOKIE,
  GOOGLE_OAUTH_MODE_COOKIE,
  GOOGLE_OAUTH_REDIRECT_COOKIE,
  getCustomerAccountReauthCookieOptions,
} from "@/lib/auth/session-cookies"
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

function getStoredRedirectPath(cookieHeader: string | null) {
  return (
    getSafeRedirectPath(
      getCookieValue(cookieHeader, GOOGLE_OAUTH_REDIRECT_COOKIE)
    ) || "/account"
  )
}

function getLinkMode(cookieHeader: string | null) {
  return getCookieValue(cookieHeader, GOOGLE_OAUTH_MODE_COOKIE) === "link"
}

function getGoogleLinkProof(cookieHeader: string | null) {
  const intentId = getCookieValue(cookieHeader, GOOGLE_OAUTH_LINK_INTENT_COOKIE)
  const nonce = getCookieValue(cookieHeader, GOOGLE_OAUTH_LINK_NONCE_COOKIE)

  return intentId && nonce ? { intentId, nonce } : null
}

function buildGoogleStatusRedirect(
  requestUrl: URL,
  redirectPath: string,
  status: "connected" | "connect_failed"
) {
  const redirectUrl = buildStorefrontRedirect(requestUrl, redirectPath)
  redirectUrl.searchParams.set("google", status)
  return redirectUrl
}

function redirectGoogleLinkStatus({
  requestUrl,
  redirectPath,
  status,
}: {
  requestUrl: URL
  redirectPath: string
  status: "connected" | "connect_failed"
}) {
  const response = NextResponse.redirect(
    buildGoogleStatusRedirect(requestUrl, redirectPath, status)
  )

  response.cookies.delete(GOOGLE_OAUTH_MODE_COOKIE)
  response.cookies.delete(GOOGLE_OAUTH_REDIRECT_COOKIE)
  response.cookies.delete(GOOGLE_OAUTH_LINK_INTENT_COOKIE)
  response.cookies.delete(GOOGLE_OAUTH_LINK_NONCE_COOKIE)

  return response
}

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
    const data = await readJsonResponse(response)
    const message =
      typeof data?.message === "string" ? data.message : ""
    if (message.includes("already exists in app metadata")) {
      return
    }
    throw new Error("Failed to create Google customer")
  }
}

async function markGoogleCustomerVerified({
  medusaBaseUrl,
  token,
}: {
  medusaBaseUrl: string
  token: string
}) {
  await fetch(`${medusaBaseUrl}/store/customers/me`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
      ...getPublishableApiHeaders(),
    },
    body: JSON.stringify({
      metadata: {
        email_verification_status: "verified",
        email_verification_source: "google",
        email_verified_at: new Date().toISOString(),
      },
    }),
    cache: "no-store",
  })
}

async function claimGoogleCustomerAccount({
  medusaBaseUrl,
  token,
  email,
  linkProof,
}: {
  medusaBaseUrl: string
  token: string
  email: string
  linkProof?: { intentId: string; nonce: string } | null
}) {
  const response = await fetch(
    `${medusaBaseUrl}/store/customers/claim-account`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
        ...getPublishableApiHeaders(),
      },
      body: JSON.stringify({
        email,
        source: "google",
        ...(linkProof
          ? {
              link_intent_id: linkProof.intentId,
              link_nonce: linkProof.nonce,
            }
          : {}),
      }),
      cache: "no-store",
    }
  )
  const data = await readJsonResponse(response)

  if (response.status === 404) {
    return { status: "no_customer" as const }
  }

  if (
    response.status === 409 &&
    (data as Record<string, unknown>)?.code === "google_link_required"
  ) {
    return { status: "link_required" as const }
  }

  if (!response.ok) {
    throw new Error("Failed to claim Google customer account")
  }

  return {
    status: "claimed" as const,
    reauthToken:
      typeof data.reauth_token === "string" ? data.reauth_token : null,
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
  const cookieHeader = request.headers.get("cookie")
  const isLinkMode = getLinkMode(cookieHeader)
  const linkProof = getGoogleLinkProof(cookieHeader)
  const redirectPath = getStoredRedirectPath(cookieHeader)
  const failureRedirect = buildStorefrontRedirect(
    requestUrl,
    isLinkMode
      ? "/account/settings?google=connect_failed"
      : "/sign-in?error=google_oauth_failed"
  )

  if (
    requestUrl.searchParams.get("error") ||
    !requestUrl.searchParams.get("code")
  ) {
    return NextResponse.redirect(failureRedirect)
  }

  if (isLinkMode && !linkProof) {
    return redirectGoogleLinkStatus({
      requestUrl,
      redirectPath,
      status: "connect_failed",
    })
  }

  try {
    const medusaBaseUrl = resolveMedusaBaseUrl({ isServer: true })
    const callbackUrl = new URL("/auth/customer/google/callback", medusaBaseUrl)
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
    const shouldResolveCustomer = isLinkMode || !decoded?.actor_id
    let sessionToken = callbackToken
    let reauthToken: string | null = null

    if (shouldResolveCustomer) {
      const email = decoded?.user_metadata?.email

      if (typeof email !== "string" || !email.includes("@")) {
        throw new Error("Google OAuth callback did not include an email")
      }

      const claimResult = await claimGoogleCustomerAccount({
        medusaBaseUrl,
        token: callbackToken,
        email,
        linkProof,
      })

      if (claimResult.status === "link_required") {
        const linkRequiredUrl = buildStorefrontRedirect(
          requestUrl,
          "/sign-in?error=google_link_required"
        )
        return NextResponse.redirect(linkRequiredUrl)
      }

      if (claimResult.status === "no_customer") {
        if (isLinkMode) {
          return redirectGoogleLinkStatus({
            requestUrl,
            redirectPath,
            status: "connect_failed",
          })
        }

        await createGoogleCustomer({
          medusaBaseUrl,
          token: callbackToken,
          email,
        })
      } else if (claimResult.status === "claimed") {
        reauthToken = claimResult.reauthToken
      }

      sessionToken = await refreshCustomerToken({
        medusaBaseUrl,
        token: callbackToken,
      })

      if (claimResult.status === "no_customer") {
        await markGoogleCustomerVerified({ medusaBaseUrl, token: sessionToken })
      }
    }

    await linkGoogleCustomerContext({
      medusaBaseUrl,
      token: sessionToken,
      cookieHeader,
    })
    const response = NextResponse.redirect(
      isLinkMode
        ? buildGoogleStatusRedirect(requestUrl, redirectPath, "connected")
        : buildStorefrontRedirect(requestUrl, redirectPath)
    )
    setCustomerSessionCookies(response, sessionToken)
    if (reauthToken) {
      response.cookies.set(
        CUSTOMER_ACCOUNT_REAUTH_COOKIE,
        reauthToken,
        getCustomerAccountReauthCookieOptions()
      )
    }

    return response
  } catch (error) {
    console.error("Google OAuth callback error:", error)
    const response = NextResponse.redirect(failureRedirect)

    if (isLinkMode) {
      response.cookies.delete(GOOGLE_OAUTH_MODE_COOKIE)
      response.cookies.delete(GOOGLE_OAUTH_REDIRECT_COOKIE)
      response.cookies.delete(GOOGLE_OAUTH_LINK_INTENT_COOKIE)
      response.cookies.delete(GOOGLE_OAUTH_LINK_NONCE_COOKIE)
    }

    return response
  }
}
