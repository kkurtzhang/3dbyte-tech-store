import { Metadata } from "next"
import { getSessionAction, updateProfileAction } from "@/app/actions/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountContent } from "./account-content"

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your account profile and settings",
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

export default async function ProfilePage() {
  const customer = await getCustomerData()

  if (!customer) {
    redirect("/sign-in")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manage your account information and preferences
        </p>
      </div>

      <AccountContent customer={customer} />
    </div>
  )
}
