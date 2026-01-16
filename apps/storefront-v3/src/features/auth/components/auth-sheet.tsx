"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { LoginForm } from "./login-form"
import { RegisterForm } from "./register-form"

type AuthMode = "login" | "register"

interface AuthSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Authentication sheet component that slides in from the right.
 * Features:
 * - Toggles between login and register modes
 * - Slide-out sheet from right side
 * - Dynamic header based on mode
 * - Switch link to toggle between modes
 * - Closes on successful authentication
 */
export function AuthSheet({ open, onOpenChange }: AuthSheetProps) {
  const [mode, setMode] = React.useState<AuthMode>("login")

  const handleSuccess = () => {
    // Close sheet on successful auth
    onOpenChange(false)
    // TODO: Refresh user state, redirect, etc.
  }

  const handleModeToggle = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"))
  }

  // Reset to login mode when sheet closes
  React.useEffect(() => {
    if (!open) {
      setMode("login")
    }
  }, [open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {mode === "login" ? "Welcome back" : "Create account"}
          </SheetTitle>
          <SheetDescription>
            {mode === "login"
              ? "Sign in to your account to continue"
              : "Create a new account to get started"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {mode === "login" ? (
            <LoginForm onSuccess={handleSuccess} />
          ) : (
            <RegisterForm onSuccess={handleSuccess} />
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleModeToggle}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <span className="font-medium">Register</span>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <span className="font-medium">Login</span>
              </>
            )}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
