import { NextResponse } from "next/server"

import {
  CUSTOMER_TOKEN_COOKIE,
  GOOGLE_OAUTH_LINK_INTENT_COOKIE,
  GOOGLE_OAUTH_LINK_NONCE_COOKIE,
  GOOGLE_OAUTH_MODE_COOKIE,
  GOOGLE_OAUTH_REDIRECT_COOKIE,
  SESSION_COOKIE,
  getCustomerSessionCookieOptions,
} from "@/lib/auth/session-cookies"

export type JwtPayload = {
  actor_id?: string
  user_metadata?: {
    email?: unknown
  }
}

export function getSafeRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null
  }

  if (value.startsWith("/auth/google/")) {
    return null
  }

  return value
}

function getConfiguredStorefrontOrigin() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (!siteUrl) {
    return null
  }

  try {
    return new URL(siteUrl).origin
  } catch {
    return null
  }
}

export function buildStorefrontRedirect(requestUrl: URL, path: string) {
  return new URL(path, getConfiguredStorefrontOrigin() ?? requestUrl.origin)
}

export function getPublishableApiHeaders(): Record<string, string> {
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  const headers: Record<string, string> = {}

  if (publishableKey) {
    headers["x-publishable-api-key"] = publishableKey
  }

  return headers
}

export function setCustomerSessionCookies(
  response: NextResponse,
  token: string
) {
  const sessionCookieOptions = getCustomerSessionCookieOptions()

  response.cookies.set(SESSION_COOKIE, "true", sessionCookieOptions)
  response.cookies.set(CUSTOMER_TOKEN_COOKIE, token, sessionCookieOptions)
  response.cookies.delete(GOOGLE_OAUTH_MODE_COOKIE)
  response.cookies.delete(GOOGLE_OAUTH_REDIRECT_COOKIE)
  response.cookies.delete(GOOGLE_OAUTH_LINK_INTENT_COOKIE)
  response.cookies.delete(GOOGLE_OAUTH_LINK_NONCE_COOKIE)
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const payload = token.split(".")[1]

  if (!payload) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
  } catch {
    return null
  }
}

export function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = cookie.trim().split("=")
    if (rawName === name) {
      return decodeURIComponent(rawValueParts.join("="))
    }
  }

  return null
}

export async function readJsonResponse(response: Response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}
