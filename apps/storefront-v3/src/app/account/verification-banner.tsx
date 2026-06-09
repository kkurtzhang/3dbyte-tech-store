"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface VerificationBannerProps {
  verified?: string
  checkoutBlocked?: string
}

export function VerificationBanner({
  verified,
  checkoutBlocked,
}: VerificationBannerProps) {
  const router = useRouter()

  useEffect(() => {
    if (verified === "1" || verified === "0") {
      const timer = setTimeout(() => {
        router.replace("/account", { scroll: false })
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [verified, router])

  if (checkoutBlocked === "unverified") {
    return (
      <div
        className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200"
        role="alert"
      >
        Please verify your email before checking out. Check your inbox for the
        verification link or use the resend button below.
      </div>
    )
  }

  if (verified === "1") {
    return (
      <div
        className="rounded-sm border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700"
        role="status"
      >
        Email verified successfully. Your account is now fully active.
      </div>
    )
  }

  if (verified === "0") {
    return (
      <div
        className="rounded-sm border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        role="alert"
      >
        Email verification failed or the link has expired. Go to account settings
        to request a new verification email.
      </div>
    )
  }

  return null
}
