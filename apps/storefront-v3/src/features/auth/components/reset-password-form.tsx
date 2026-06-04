"use client"

import * as React from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { resetPasswordAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { strongPasswordSchema } from "@/lib/auth/password"
import { zodFormResolver } from "@/lib/forms/zod-form-resolver"

const resetPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
const resetPasswordResolver =
  zodFormResolver<ResetPasswordFormData>(resetPasswordSchema)

type ResetPasswordFormProps = {
  email: string
  token: string
}

export function ResetPasswordForm({ email, token }: ResetPasswordFormProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: resetPasswordResolver,
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const result = await resetPasswordAction(email, token, data.password)

      if (!result.success) {
        setError(result.error || "Unable to reset password")
        return
      }

      reset()
      setSuccessMessage("Your password has been reset. You can sign in now.")
    } catch (error) {
      console.error("Password reset error:", error)
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-password-new">New password</Label>
        <Input
          id="reset-password-new"
          type="password"
          placeholder="Enter new password"
          {...register("password")}
          disabled={isLoading || Boolean(successMessage)}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-password-confirm">Confirm password</Label>
        <Input
          id="reset-password-confirm"
          type="password"
          placeholder="Confirm new password"
          {...register("confirmPassword")}
          disabled={isLoading || Boolean(successMessage)}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="space-y-3 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700">
          <p>{successMessage}</p>
          <Link href="/sign-in" className="font-medium underline underline-offset-4">
            Sign in
          </Link>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || Boolean(successMessage)}
      >
        {isLoading ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  )
}
