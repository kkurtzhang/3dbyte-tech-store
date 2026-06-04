import type { Metadata } from "next"
import Link from "next/link"

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form"

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a password reset link for your 3D Byte Tech account.",
}

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
        <p className="text-muted-foreground">
          Enter your account email and we&apos;ll send reset instructions.
        </p>
      </div>

      <div className="p-6 border rounded-sm border-cyan-500/10 bg-slate-900/10 dark:bg-slate-950/20 text-card-foreground shadow-[0_0_15px_rgba(6,182,212,0.02)]">
        <ForgotPasswordForm />
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-primary hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}
