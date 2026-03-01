"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/lib/hooks/use-toast"
import { validateEmail } from "@3dbyte-tech-store/shared-utils"

interface NewsletterSignupProps {
  compact?: boolean
  variant?: "default" | "minimal"
}

export function NewsletterSignup({ compact = false, variant = "default" }: NewsletterSignupProps) {
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !validateEmail(email)) {
      toast({
        variant: "destructive",
        title: "Invalid email",
        description: "Please enter a valid email address.",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to subscribe")
      }

      toast({
        title: "Success!",
        description: "You've been subscribed to the newsletter.",
      })

      setIsSubmitted(true)
      setEmail("")
      setFirstName("")
      setLastName("")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted && variant === "minimal") {
    return null
  }

  if (isSubmitted) {
    return (
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          ✓ Thanks for subscribing!
        </p>
      </div>
    )
  }

  if (variant === "minimal") {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading} size="sm">
          {isLoading ? "..." : "Join"}
        </Button>
      </form>
    )
  }

  return (
    <div className={compact ? "" : "rounded-lg border bg-muted/50 p-6"}>
      <div className="mb-4">
        <h3 className={compact ? "text-sm font-semibold" : "text-lg font-semibold"}>
          {compact ? "Stay Updated" : "Join 3D Byte Tech Newsletter"}
        </h3>
        <p className={compact ? "text-xs mt-1 text-muted-foreground" : "text-sm mt-1 text-muted-foreground"}>
          {compact
            ? "Get exclusive deals and 3D printing tips."
            : "Subscribe to get exclusive deals, 3D printing tips, and new product announcements."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {!compact && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName" className="text-xs">
                First Name
              </Label>
              <Input
                id="firstName"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName" className="text-xs">
                Last Name
              </Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="email" className="text-xs">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Subscribing..." : "Subscribe"}
        </Button>
      </form>

      <p className="mt-3 text-[10px] text-muted-foreground">
        By subscribing, you agree to our{" "}
        <Link href="/privacy-policy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        . We respect your inbox and will only send valuable content.
      </p>
    </div>
  )
}
