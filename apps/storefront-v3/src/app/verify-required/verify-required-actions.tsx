"use client"

import { useState } from "react"
import { Loader2, LogOut, Mail } from "lucide-react"

import { logoutAction, resendVerificationEmailAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { navigateTo } from "@/lib/browser/navigation"

export function VerifyRequiredActions() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  )
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleResend = async () => {
    setStatus("sending")
    const result = await resendVerificationEmailAction()
    setStatus(result.success ? "sent" : "error")
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await logoutAction()
    navigateTo("/sign-in")
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        type="button"
        disabled={status === "sending" || status === "sent"}
        onClick={handleResend}
      >
        {status === "sending" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        {status === "sent" ? "Verification email sent" : "Resend email"}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={isSigningOut}
        onClick={handleSignOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
      {status === "error" && (
        <p className="text-sm text-destructive" role="alert">
          Could not send the email. Try again in a moment.
        </p>
      )}
    </div>
  )
}
