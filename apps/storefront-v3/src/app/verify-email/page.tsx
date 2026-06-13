import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { CUSTOMER_TOKEN_COOKIE } from "@/lib/auth/session-cookies"
import { buildVerifyRequiredPath } from "@/lib/auth/verification-required"
import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url"

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string
  }>
}

function getPublishableApiHeaders(): Record<string, string> {
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  const headers: Record<string, string> = {}

  if (publishableKey) {
    headers["x-publishable-api-key"] = publishableKey
  }

  return headers
}

function getSafeBackendRedirectPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null
  }

  try {
    const parsed = new URL(value)
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return value.startsWith("/") && !value.startsWith("//") ? value : null
  }
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams
  const cookieStore = await cookies()
  const isLoggedIn = Boolean(cookieStore.get(CUSTOMER_TOKEN_COOKIE)?.value)

  if (!token) {
    redirect(
      isLoggedIn
        ? buildVerifyRequiredPath({ verified: "0" })
        : "/sign-in?verified=0",
    )
  }

  let verified = false
  let backendRedirectPath: string | null = null

  try {
    const url = new URL(
      "/store/customers/email-verifications",
      resolveMedusaBaseUrl({ isServer: true }),
    )
    url.searchParams.set("token", token)
    url.searchParams.set("response", "json")

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        ...getPublishableApiHeaders(),
        accept: "application/json",
      },
    })
    const payload = (await response.json().catch(() => null)) as {
      redirect_to?: unknown
      verified?: unknown
    } | null

    verified = response.ok && payload?.verified === true
    backendRedirectPath = getSafeBackendRedirectPath(payload?.redirect_to)
  } catch {
    verified = false
  }

  if (verified) {
    revalidatePath("/account", "layout")
    revalidatePath("/account/settings")

    if (
      isLoggedIn &&
      backendRedirectPath?.startsWith("/account/settings?email=")
    ) {
      redirect(backendRedirectPath)
    }

    redirect(isLoggedIn ? "/account?verified=1" : "/sign-in?verified=1")
  }

  redirect(
    isLoggedIn
      ? buildVerifyRequiredPath({ verified: "0" })
      : "/sign-in?verified=0",
  )
}
