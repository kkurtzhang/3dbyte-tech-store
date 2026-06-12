import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { CUSTOMER_TOKEN_COOKIE } from "@/lib/auth/session-cookies"
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

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams
  const cookieStore = await cookies()
  const isLoggedIn = Boolean(cookieStore.get(CUSTOMER_TOKEN_COOKIE)?.value)

  if (!token) {
    redirect(isLoggedIn ? "/account?verified=0" : "/sign-in?verified=0")
  }

  let verified = false

  try {
    const url = new URL(
      "/store/customers/email-verifications",
      resolveMedusaBaseUrl({ isServer: true }),
    )
    url.searchParams.set("token", token)

    const response = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      headers: {
        ...getPublishableApiHeaders(),
      },
    })
    const location = response.headers.get("location") || ""

    verified =
      response.status >= 300 &&
      response.status < 400 &&
      (location.includes("verified=1") || location.includes("email=changed"))
  } catch {
    verified = false
  }

  if (verified) {
    revalidatePath("/account", "layout")
    revalidatePath("/account/settings")
    redirect(isLoggedIn ? "/account?verified=1" : "/sign-in?verified=1")
  }

  redirect(isLoggedIn ? "/account?verified=0" : "/sign-in?verified=0")
}
