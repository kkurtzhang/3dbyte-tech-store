import type { Metadata } from "next"
import { MailCheck } from "lucide-react"
import { redirect } from "next/navigation"

import { getSessionAction } from "@/app/actions/auth"
import { getSafeRedirectPath } from "@/lib/auth/verification-required"

import { VerifyRequiredActions } from "./verify-required-actions"

export const metadata: Metadata = {
  title: "Verify Your Email",
  description: "Verify your email address to finish activating your account.",
}

type VerifyRequiredPageProps = {
  searchParams?: Promise<{
    redirect?: string | string[]
    source?: string | string[]
    verified?: string | string[]
  }>
}

function getSingleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function getCopy(source?: string, verified?: string) {
  if (verified === "0") {
    return {
      heading: "Verification link did not work",
      body: "That verification link may have expired. Send yourself a fresh link and try again.",
    }
  }

  if (source === "checkout") {
    return {
      heading: "Verify your email before checkout",
      body: "Your account is signed in, but checkout stays locked until we confirm you own this email address.",
    }
  }

  if (source === "signin") {
    return {
      heading: "Verify your email to continue",
      body: "You are signed in. Confirm your email address before using your account.",
    }
  }

  if (source === "registered") {
    return {
      heading: "Account created",
      body: "We sent a verification link to your inbox. Confirm your email to activate account features and checkout.",
    }
  }

  return {
    heading: "Verify your email",
    body: "Confirm your email address before using account features, saved addresses, order history, and checkout.",
  }
}

export default async function VerifyRequiredPage({
  searchParams,
}: VerifyRequiredPageProps) {
  const params = await searchParams
  const source = getSingleParam(params?.source)
  const verified = getSingleParam(params?.verified)
  const redirectTo = getSafeRedirectPath(getSingleParam(params?.redirect))
  const session = await getSessionAction()

  if (!session.success || !session.user) {
    redirect("/sign-in")
    return null
  }

  if (session.user.email_verified !== false) {
    redirect(redirectTo || "/account")
    return null
  }

  const copy = getCopy(source, verified)

  return (
    <main className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <section className="w-full max-w-xl space-y-6 rounded-lg border bg-card p-6 shadow-sm md:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {copy.heading}
            </h1>
            <p className="text-sm text-muted-foreground">{copy.body}</p>
          </div>
        </div>

        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">Email pending verification</p>
          <p className="mt-1 break-all">{session.user.email}</p>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Once you click the verification link, this browser will refresh your
            account state automatically. You can then continue to{" "}
            {redirectTo === "/checkout" ? "checkout" : "your account"}.
          </p>
          <p>
            If the email is not in your inbox, check spam or send a new link.
          </p>
        </div>

        <VerifyRequiredActions />
      </section>
    </main>
  )
}
