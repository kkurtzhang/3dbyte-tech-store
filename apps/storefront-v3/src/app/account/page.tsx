import { Metadata } from "next"
import { getSessionAction } from "@/app/actions/auth"
import { redirect } from "next/navigation"
import { AccountContent } from "./account-content"

export const metadata: Metadata = {
  title: "Account Overview",
  description: "View your account overview and manage account activity",
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

export default async function AccountPage() {
  const customer = await getCustomerData()

  if (!customer) {
    redirect("/sign-in")
  }

  return (
    <div className="space-y-6">
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
