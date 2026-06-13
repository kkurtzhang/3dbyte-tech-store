"use client"

import { Loader2 } from "lucide-react"

type AuthLoadingOverlayProps = {
  message: string
}

export function AuthLoadingOverlay({ message }: AuthLoadingOverlayProps) {
  return (
    <div
      aria-busy="true"
      aria-live="assertive"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
      data-testid="auth-loading-overlay"
      role="status"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-lg border bg-card p-6 text-center shadow-lg">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-base font-medium text-foreground">{message}</p>
        <p className="text-sm text-muted-foreground">
          Please keep this page open.
        </p>
      </div>
    </div>
  )
}
