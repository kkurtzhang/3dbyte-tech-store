"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Error:", error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-6xl font-bold text-foreground">Oops!</h1>
        <h2 className="mt-4 text-2xl font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="mt-2 text-muted-foreground">
          An unexpected error occurred. We've been notified and are working to fix it.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <a href="/">Go Home</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
