"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, LayoutGrid } from "lucide-react"

import { Button } from "@/components/ui/button"

export function CollectionsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <LayoutGrid className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-semibold">No collections available</h3>
      <p className="mb-4 max-w-md text-muted-foreground">
        Check back soon as we publish more curated collection groupings.
      </p>
      <Button variant="outline" asChild>
        <Link href="/shop">Browse All Products</Link>
      </Button>
    </div>
  )
}

export function CollectionsErrorState() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-semibold">Unable to load collections</h3>
      <p className="mb-4 max-w-md text-muted-foreground">
        We&apos;re having trouble connecting to our catalog right now. Please try again.
      </p>
      <Button onClick={() => router.refresh()}>Try Again</Button>
    </div>
  )
}
