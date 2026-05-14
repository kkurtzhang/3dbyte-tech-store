import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { removeManagedWaitlistItemAction } from "./actions"

export const metadata: Metadata = {
  title: "Manage Waitlist | 3D Byte Tech",
  description: "Manage a product waitlist notification",
}

type ManageWaitlistPageProps = {
  searchParams: Promise<{
    removed?: string
    token?: string
  }>
}

export default async function ManageWaitlistPage({
  searchParams,
}: ManageWaitlistPageProps) {
  const { removed, token = "" } = await searchParams

  async function removeNotification() {
    "use server"

    await removeManagedWaitlistItemAction(token)
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-4 py-16">
      <h1 className="mb-3 text-3xl font-bold">Manage waitlist notification</h1>
      <p className="mb-8 text-muted-foreground">
        Remove this product notification if you no longer want a back-in-stock
        email for it.
      </p>
      {removed ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          This waitlist notification has been removed.
        </p>
      ) : token ? (
        <form action={removeNotification}>
          <Button type="submit" className="w-full sm:w-auto">
            Remove notification
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          This waitlist link is missing its management token.
        </p>
      )}
      <Button asChild variant="link" className="mt-6 w-fit px-0">
        <Link href="/shop">Continue shopping</Link>
      </Button>
    </main>
  )
}
