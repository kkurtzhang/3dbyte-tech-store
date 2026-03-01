import { getSessionAction } from "@/app/actions/auth"
import { SettingsContent } from "./settings-client"

export default async function SettingsPage() {
  const { success, user } = await getSessionAction()

  if (!success || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please sign in to access settings</p>
      </div>
    )
  }

  return <SettingsContent customer={user} />
}
