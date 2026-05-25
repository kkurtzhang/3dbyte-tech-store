import { getSessionAction } from "@/app/actions/auth"
import { redirect } from "next/navigation"
import { SettingsContent } from "./settings-client"

export default async function SettingsPage() {
  const { success, user } = await getSessionAction()

  if (!success || !user) {
    redirect("/sign-in")
  }

  return <SettingsContent customer={user} />
}
