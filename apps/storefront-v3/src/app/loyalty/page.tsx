import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSessionAction } from "@/app/actions/auth"
import { getLoyaltyDataAction } from "@/app/actions/loyalty"
import { LoyaltyClient } from "./loyalty-client"

export const metadata: Metadata = {
  title: "Loyalty Rewards",
  description: "View your loyalty points, rewards, and tier status",
}

async function getLoyaltyData() {
  try {
    const session = await getSessionAction()
    if (!session.success) {
      return null
    }
    const result = await getLoyaltyDataAction()
    if (!result.success) {
      return null
    }
    return result
  } catch (error) {
    console.error("Failed to fetch loyalty data:", error)
    return null
  }
}

export default async function LoyaltyPage() {
  const session = await getSessionAction()
  
  if (!session.success) {
    redirect("/sign-in")
  }

  const loyaltyData = await getLoyaltyData()

  if (!loyaltyData) {
    redirect("/account")
  }

  return (
    <LoyaltyClient
      loyalty={loyaltyData.loyalty!}
      transactions={loyaltyData.transactions!}
      tiers={loyaltyData.tiers!}
    />
  )
}
