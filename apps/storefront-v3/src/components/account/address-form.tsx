"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useState } from "react"
import type { MeilisearchAddressDocument } from "@3dbyte-tech-store/shared-types"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AddressAutocomplete } from "@/features/checkout/components/address-autocomplete"

interface Address {
  id: string
  address_name?: string | null
  first_name: string
  last_name: string
  company?: string | null
  address_1: string
  address_2?: string
  city: string
  province?: string
  country_code: string
  postal_code: string
  phone?: string
  is_default?: boolean
  is_default_shipping?: boolean
  is_default_billing?: boolean
}

type AddressFormValues = {
  address_name: string
  first_name: string
  last_name: string
  company: string
  address_1: string
  address_2: string
  city: string
  province: string
  country_code: string
  postal_code: string
  phone: string
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
  const [formValues, setFormValues] = useState<AddressFormValues>(() => ({
    address_name: address?.address_name || "",
    first_name: address?.first_name || "",
    last_name: address?.last_name || "",
    company: address?.company || "",
    address_1: address?.address_1 || "",
    address_2: address?.address_2 || "",
    city: address?.city || "",
    province: address?.province || "",
    country_code: address?.country_code?.toUpperCase() || "AU",
    postal_code: address?.postal_code || "",
    phone: address?.phone || "",
  }))
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const inputId = (field: string) =>
    address ? `${address.id}-${field}` : `new-${field}`

  const updateField = (field: keyof AddressFormValues, value: string) => {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleInputChange =
    (field: keyof AddressFormValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      updateField(field, event.target.value)
    }

  const handleAutocompleteSelect = (selectedAddress: MeilisearchAddressDocument) => {
    setFormValues((current) => ({
      ...current,
      address_1:
        `${selectedAddress.number} ${selectedAddress.street}`.trim() ||
        selectedAddress.full_address,
      address_2: selectedAddress.unit || "",
      city: selectedAddress.suburb,
      province: selectedAddress.state,
      postal_code: selectedAddress.postcode,
      country_code: selectedAddress.country.toUpperCase(),
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = {
        address_name: formValues.address_name || undefined,
        first_name: formValues.first_name,
        last_name: formValues.last_name,
        company: formValues.company || undefined,
        address_1: formValues.address_1,
        address_2: formValues.address_2 || undefined,
        city: formValues.city,
        province: formValues.province,
        country_code: formValues.country_code,
        postal_code: formValues.postal_code,
        phone: formValues.phone || undefined,
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
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={inputId("address_name")}>
            Address Name (Optional)
          </Label>
          <Input
            id={inputId("address_name")}
            name="address_name"
            value={formValues.address_name}
            onChange={handleInputChange("address_name")}
            placeholder="Home"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={inputId("first_name")}>First Name</Label>
          <Input
            id={inputId("first_name")}
            name="first_name"
            value={formValues.first_name}
            onChange={handleInputChange("first_name")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={inputId("last_name")}>Last Name</Label>
          <Input
            id={inputId("last_name")}
            name="last_name"
            value={formValues.last_name}
            onChange={handleInputChange("last_name")}
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={inputId("company")}>Company (Optional)</Label>
          <Input
            id={inputId("company")}
            name="company"
            value={formValues.company}
            onChange={handleInputChange("company")}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={inputId("address_1")}>Address</Label>
          <AddressAutocomplete
            id={inputId("address_1")}
            defaultValue={formValues.address_1}
            onValueChange={(value) => updateField("address_1", value)}
            onSelect={handleAutocompleteSelect}
          />
          <input
            type="hidden"
            name="address_1"
            value={formValues.address_1}
            readOnly
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
            value={formValues.address_2}
            onChange={handleInputChange("address_2")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={inputId("city")}>City</Label>
          <Input
            id={inputId("city")}
            name="city"
            value={formValues.city}
            onChange={handleInputChange("city")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={inputId("province")}>State</Label>
          <Input
            id={inputId("province")}
            name="province"
            value={formValues.province}
            onChange={handleInputChange("province")}
            placeholder="TAS"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={inputId("postal_code")}>Postal Code</Label>
          <Input
            id={inputId("postal_code")}
            name="postal_code"
            value={formValues.postal_code}
            onChange={handleInputChange("postal_code")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={inputId("country_code")}>Country Code</Label>
          <Input
            id={inputId("country_code")}
            name="country_code"
            value={formValues.country_code}
            onChange={handleInputChange("country_code")}
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
            value={formValues.phone}
            onChange={handleInputChange("phone")}
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
