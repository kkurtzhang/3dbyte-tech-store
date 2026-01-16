import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your account profile and settings",
}

/**
 * Profile page - Account landing page for logged-in users.
 * Displays user profile information and settings.
 * Currently a placeholder - will be populated with Medusa user data.
 */
export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold uppercase tracking-wider">
          Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manage your account information and preferences
        </p>
      </div>

      <div className="rounded-lg border bg-card p-8">
        <p className="text-muted-foreground">
          Your profile information will appear here.
        </p>
      </div>
    </div>
  )
}
