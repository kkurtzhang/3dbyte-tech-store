"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Pencil } from "lucide-react"

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
  onSuccess?: () => void
}

export function AddressForm({ address, onSuccess }: AddressFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const inputId = (field: string) => address ? `${address.id}-${field}` : `new-${field}`

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const data = {
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string,
        address_1: formData.get("address_1") as string,
        address_2: formData.get("address_2") as string || undefined,
        city: formData.get("city") as string,
        country_code: formData.get("country_code") as string,
        postal_code: formData.get("postal_code") as string,
        phone: formData.get("phone") as string || undefined,
      }

      const url = address 
        ? `/account/addresses?action=update&id=${address.id}`
        : `/account/addresses?action=add`
      
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        setIsOpen(false)
        onSuccess?.()
        window.location.reload()
      }
    } catch (error) {
      console.error("Error saving address:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {address ? (
          <Button variant="outline" size="sm" className="font-mono text-xs uppercase tracking-wider">
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        ) : (
          <Button type="button" className="font-mono uppercase tracking-widest">
            <span className="mr-2">+</span>
            Add Address
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="font-mono uppercase tracking-wider">
            {address ? "Edit Address" : "Add New Address"}
          </SheetTitle>
        </SheetHeader>
        <form action={handleSubmit} className="space-y-4 mt-6">
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
              <Label htmlFor={inputId("address_2")}>Address Line 2 (Optional)</Label>
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
                defaultValue={address?.country_code}
                placeholder="US"
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
          <div className="flex gap-2 mt-6">
            <Button type="submit" disabled={isLoading} className="font-mono uppercase tracking-widest">
              {isLoading ? "Saving..." : "Save Address"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="font-mono uppercase tracking-wider">
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
