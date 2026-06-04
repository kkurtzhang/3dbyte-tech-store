import type { Metadata } from "next"
import Link from "next/link"

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form"

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your 3D Byte Tech account.",
}

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    email?: string | string[]
    token?: string | string[]
  }>
}

const readParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps = {}) {
  const params = await searchParams
  const email = readParam(params?.email) || ""
  const token = readParam(params?.token) || ""
  const hasResetParams = Boolean(email && token)

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Set new password</h1>
        <p className="text-muted-foreground">
          Choose a strong password for your account.
        </p>
      </div>

      <div className="p-6 border rounded-sm border-cyan-500/10 bg-slate-900/10 dark:bg-slate-950/20 text-card-foreground shadow-[0_0_15px_rgba(6,182,212,0.02)]">
        {hasResetParams ? (
          <ResetPasswordForm email={email} token={token} />
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              This reset link is missing required details. Request a new link to
              continue.
            </p>
            <Link
              href="/forgot-password"
              className="font-medium text-primary hover:underline underline-offset-4"
            >
              Request a new reset link
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
