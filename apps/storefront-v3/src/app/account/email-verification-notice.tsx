"use client"

import { useState } from "react"
import { Loader2, Mail } from "lucide-react"

import { resendVerificationEmailAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"

export function EmailVerificationNotice() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  )

  const handleResend = async () => {
    setStatus("sending")
    const result = await resendVerificationEmailAction()
    setStatus(result.success ? "sent" : "error")
  }

  return (
    <div className="mb-6 rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Verify your email to unlock full account access
          </p>
          <p className="text-sm text-amber-700/80 dark:text-amber-300/70">
            Check your inbox for a verification link. Until verified, placing
            orders and changing account security settings are restricted.
          </p>
          {status === "sent" && (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Verification email sent. Check your inbox.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">
              Could not send the email. Try again in a moment.
            </p>
          )}
          {status !== "sent" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={status === "sending"}
              onClick={handleResend}
              className="mt-1"
            >
              {status === "sending" && (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              )}
              Resend verification email
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
