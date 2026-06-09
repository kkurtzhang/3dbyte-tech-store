import { Metadata } from "next"
import { getSessionAction } from "@/app/actions/auth"
import { redirect } from "next/navigation"
import { AccountContent } from "./account-content"
import { VerificationBanner } from "./verification-banner"

export const metadata: Metadata = {
  title: "Account Overview",
  description: "View your account overview and manage account activity",
}

interface AccountPageProps {
  searchParams?: Promise<{
    verified?: string | string[]
    checkout_blocked?: string | string[]
  }>
}

async function getCustomerData() {
  try {
    const session = await getSessionAction()
    if (!session.success) {
      return null
    }
    return session.user
  } catch (error) {
    console.error("Failed to fetch customer data:", error)
    return null
  }
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const customer = await getCustomerData()

  if (!customer) {
    redirect("/sign-in")
  }

  const params = await searchParams
  const verified = Array.isArray(params?.verified)
    ? params.verified[0]
    : params?.verified
  const checkoutBlocked = Array.isArray(params?.checkout_blocked)
    ? params.checkout_blocked[0]
    : params?.checkout_blocked

  return (
    <div className="space-y-6">
      <VerificationBanner
        verified={verified}
        checkoutBlocked={checkoutBlocked}
      />

      <div>
        <h1 className="text-2xl font-semibold">
          Account Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Review your account details and jump into common account tasks.
        </p>
      </div>

      <AccountContent customer={customer} />
    </div>
  )
}
