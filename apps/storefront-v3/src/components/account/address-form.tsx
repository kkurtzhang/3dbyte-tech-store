"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Address {
  id: string
  first_name: string
  last_name: string
  address_1: string
  address_2?: string
  city: string
  country_code: string
  postal_code: string
  phone?: string
  is_default?: boolean
}

interface AddressFormProps {
  address?: Address
  cancelHref?: string
  onSuccess?: () => void
  title?: string
}

export function AddressForm({
  address,
  cancelHref = "/account/addresses",
  onSuccess,
  title,
}: AddressFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const inputId = (field: string) =>
    address ? `${address.id}-${field}` : `new-${field}`

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const formData = new FormData(event.currentTarget)
      const data = {
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string,
        address_1: formData.get("address_1") as string,
        address_2: (formData.get("address_2") as string) || undefined,
        city: formData.get("city") as string,
        country_code: formData.get("country_code") as string,
        postal_code: formData.get("postal_code") as string,
        phone: (formData.get("phone") as string) || undefined,
      }

      const url = address
        ? `/api/addresses?action=update&id=${address.id}`
        : `/api/addresses?action=add`

      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      })
      const payload = await response
        .json()
        .catch(() => ({ success: false, error: "Failed to save address" }))

      if (response.ok && payload?.success) {
        onSuccess?.()
        router.refresh()
        router.push(cancelHref)
        return
      }

      setErrorMessage(payload?.error || "Failed to save address")
    } catch (error) {
      console.error("Error saving address:", error)
      setErrorMessage("Failed to save address")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form
      aria-label={address ? "Edit address" : "Add address"}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div>
        <h2 className="font-mono text-lg font-semibold uppercase tracking-wider">
          {title || (address ? "Edit address" : "Add address")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {address
            ? "Update this saved address for future checkout."
            : "Save an address so checkout is faster next time."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={inputId("first_name")}>First Name</Label>
          <Input
            id={inputId("first_name")}
            name="first_name"
            defaultValue={address?.first_name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={inputId("last_name")}>Last Name</Label>
          <Input
            id={inputId("last_name")}
            name="last_name"
            defaultValue={address?.last_name}
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={inputId("address_1")}>Address Line 1</Label>
          <Input
            id={inputId("address_1")}
            name="address_1"
            defaultValue={address?.address_1}
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={inputId("address_2")}>
            Address Line 2 (Optional)
          </Label>
          <Input
            id={inputId("address_2")}
            name="address_2"
            defaultValue={address?.address_2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={inputId("city")}>City</Label>
          <Input
            id={inputId("city")}
            name="city"
            defaultValue={address?.city}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={inputId("postal_code")}>Postal Code</Label>
          <Input
            id={inputId("postal_code")}
            name="postal_code"
            defaultValue={address?.postal_code}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={inputId("country_code")}>Country Code</Label>
          <Input
            id={inputId("country_code")}
            name="country_code"
            defaultValue={address?.country_code || "AU"}
            placeholder="AU"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={inputId("phone")}>Phone (Optional)</Label>
          <Input
            id={inputId("phone")}
            name="phone"
            type="tel"
            defaultValue={address?.phone}
          />
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={isLoading}
          className="font-mono uppercase tracking-widest"
        >
          {isLoading ? "Saving..." : "Save Address"}
        </Button>
        <Button
          asChild
          variant="outline"
          className="font-mono uppercase tracking-wider"
        >
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
