"use client"

import { useRouter } from "next/navigation"

import { AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ShopErrorState() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Unable to load products</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        We're having trouble connecting to our servers. Please try again.
      </p>
      <Button onClick={() => router.refresh()}>Try Again</Button>
    </div>
  )
}
