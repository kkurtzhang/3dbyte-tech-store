import { redirect } from "next/navigation"

import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url"

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string
  }>
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams

  if (!token) {
    redirect("/sign-in?verified=0")
  }

  let verified = false

  try {
    const url = new URL(
      "/store/customers/email-verifications",
      resolveMedusaBaseUrl({ isServer: true })
    )
    url.searchParams.set("token", token)

    const response = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
    })
    const location = response.headers.get("location") || ""

    verified =
      response.status >= 300 &&
      response.status < 400 &&
      location.includes("verified=1")
  } catch {
    verified = false
  }

  redirect(verified ? "/sign-in?verified=1" : "/sign-in?verified=0")
}
