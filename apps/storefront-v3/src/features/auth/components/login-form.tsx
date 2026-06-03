"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAction } from "@/app/actions/auth"
import { GoogleIcon } from "@/components/ui/google-icon"
import { zodFormResolver } from "@/lib/forms/zod-form-resolver"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormData = z.infer<typeof loginSchema>
const loginResolver = zodFormResolver<LoginFormData>(loginSchema)

interface LoginFormProps {
  onSuccess?: () => void
}

function getSafeRedirectPath() {
  const redirectTo = new URLSearchParams(window.location.search).get("redirect")
  return redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
    ? redirectTo
    : null
}

/**
 * Login form component for authenticating existing users.
 * Features:
 * - Email and password validation using zod
 * - Form state management with react-hook-form
 * - Integration with Medusa authentication
 * - Error display for validation
 */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: loginResolver,
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await loginAction(data.email, data.password)

      if (result.success) {
        router.refresh()
        onSuccess?.()
        const redirectTo = getSafeRedirectPath()
        if (redirectTo) {
          router.push(redirectTo)
        }
      } else {
        setError(result.error || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)
    const redirectTo = getSafeRedirectPath()
    const startUrl = new URL("/auth/google/start", window.location.origin)

    if (redirectTo) {
      startUrl.searchParams.set("redirect", redirectTo)
    }

    window.location.href = startUrl.toString()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
        disabled={isLoading}
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="your@email.com"
          {...register("email")}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Link
            href="/contact"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="login-password"
          type="password"
          placeholder="••••••••"
          {...register("password")}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  )
}
