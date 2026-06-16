import { redirect } from "next/navigation"
import { Suspense } from "react"

import { getSessionAction } from "@/app/actions/auth"
import { AccountShellSkeleton } from "@/components/loading/storefront-page-skeletons"
import { buildVerifyRequiredPath } from "@/lib/auth/verification-required"

import { AccountNav } from "./account-nav"

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<AccountShellSkeleton />}>
      <AccountAccessBoundary>{children}</AccountAccessBoundary>
    </Suspense>
  )
}

export async function AccountAccessBoundary({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionAction()

  if (session.success && session.user?.email_verified === false) {
    redirect(buildVerifyRequiredPath({ source: "account" }))
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8 md:flex-row">
        <AccountNav />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
