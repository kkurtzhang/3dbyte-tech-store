import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Addresses",
  description: "Manage your saved shipping and billing addresses",
}

/**
 * Addresses page - Manage customer shipping and billing addresses.
 * Currently a placeholder - will be populated with Medusa address data.
 */
export default function AddressesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold uppercase tracking-wider">
          Addresses
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manage your shipping and billing addresses
        </p>
      </div>

      <div className="rounded-lg border bg-card p-8">
        <p className="text-muted-foreground">
          Your saved addresses will appear here.
        </p>
      </div>
    </div>
  )
}
