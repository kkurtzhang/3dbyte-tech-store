"use client"

import React from "react"

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ErrorBoundary({ children, fallback }: Props) {
  return (
    <React.Suspense fallback={fallback}>
      {children}
    </React.Suspense>
  )
}

export function ShopErrorFallback({
  reset,
}: {
  reset: () => void
}) {
  return (
    <div className="flex min-h-[400px flex-col items-center justify-center rounded-lg border border-dashed border-destructive/50 bg-destructive/5 p-12 text-center">
      <div className="max-w-md">
        <h2 className="text-lg font-semibold text-destructive mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          We couldn't load the products. Please try again or contact support if the
          problem persists.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
