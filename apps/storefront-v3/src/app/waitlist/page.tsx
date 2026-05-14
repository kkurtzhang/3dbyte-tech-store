import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSessionAction } from "@/app/actions/auth"
import { WaitlistClient } from "./waitlist-client"

export const metadata: Metadata = {
  title: "My Waitlist | 3D Byte Store",
  description: "Manage your product notifications and back-in-stock alerts",
}

export default async function WaitlistPage() {
  const session = await getSessionAction()

  if (!session.success) {
    redirect("/sign-in")
  }

  return <WaitlistClient />
}
