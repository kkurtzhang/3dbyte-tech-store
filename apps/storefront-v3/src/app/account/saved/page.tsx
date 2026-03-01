import { Metadata } from "next"
import { getSessionAction } from "@/app/actions/auth"
import { redirect } from "next/navigation"
import { SavedItemsClient } from "./saved-client"

export const metadata: Metadata = {
  title: "Saved Items",
  description: "View your saved items for later",
}

async function getSession() {
  try {
    const session = await getSessionAction()
    if (!session.success) {
      return null
    }
    return session.user
  } catch (error) {
    console.error("Failed to fetch session:", error)
    return null
  }
}

export default async function SavedPage() {
  const user = await getSession()

  // For now, allow access - saved items are stored locally
  // In future, could require auth: if (!user) { redirect("/sign-in") }

  return <SavedItemsClient />
}
