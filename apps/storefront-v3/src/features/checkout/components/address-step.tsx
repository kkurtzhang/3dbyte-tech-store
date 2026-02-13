"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MapPin, Plus, Home } from "lucide-react"
import { getAddressesAction, CustomerAddress } from "@/app/actions/auth"

const addressSchema = z.object({
  email: z.string().email("Invalid email address"),
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  address_1: z.string().min(1, "Required"),
  address_2: z.string().optional(),
  city: z.string().min(1, "Required"),
  postal_code: z.string().min(1, "Required"),
  country_code: z.string().min(2, "Required"), // Simplified for now
  phone: z.string().optional(),
})

type AddressFormData = z.infer<typeof addressSchema>

interface AddressStepProps {
  defaultValues?: Partial<AddressFormData>
  onComplete: (data: AddressFormData) => Promise<void> | void
}

export function AddressStep({ defaultValues, onComplete }: AddressStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [useSavedAddress, setUseSavedAddress] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      email: "",
      country_code: "us",
      ...defaultValues,
    },
  })

  // Load saved addresses on mount
  useEffect(() => {
    loadSavedAddresses()
  }, [])

  const loadSavedAddresses = async () => {
    setIsLoadingAddresses(true)
    try {
      const result = await getAddressesAction()
      if (result.success) {
        setSavedAddresses(result.addresses)
        // Auto-select default address if available
        const defaultAddress = result.addresses.find((addr: CustomerAddress) => addr.is_default)
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id)
          setUseSavedAddress(true)
        }
      }
    } catch (error) {
      console.error("Failed to load addresses:", error)
    } finally {
      setIsLoadingAddresses(false)
    }
  }

  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId)
    setUseSavedAddress(true)
  }

  const handleUseNewAddress = () => {
    setSelectedAddressId(null)
    setUseSavedAddress(false)
    reset({
      email: "",
      country_code: "us",
      ...defaultValues,
    })
  }

  const onSubmit = async (data: AddressFormData) => {
    setIsSubmitting(true)
    try {
      // If using a saved address, populate form data from it
      if (useSavedAddress && selectedAddressId) {
        const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId)
        if (selectedAddress) {
          data.first_name = selectedAddress.first_name
          data.last_name = selectedAddress.last_name
          data.address_1 = selectedAddress.address_1
          data.address_2 = selectedAddress.address_2 || ""
          data.city = selectedAddress.city
          data.country_code = selectedAddress.country_code
          data.postal_code = selectedAddress.postal_code
          data.phone = selectedAddress.phone || ""
        }
      }
      await onComplete(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-2">
        <h2 className="text-xl font-bold">Contact Information</h2>
        <p className="text-sm text-muted-foreground">
          Required for secure transmission of digital receipts.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="engineer@example.com"
            {...register("email")}
            className={cn(errors.email && "border-destructive")}
          />
          {errors.email && (
            <span className="text-xs text-destructive">{errors.email.message}</span>
          )}
        </div>

        <Separator className="my-2" />

        {/* Saved Addresses Section */}
        {!isLoadingAddresses && savedAddresses.length > 0 && (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <h3 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Saved Addresses
              </h3>
              <RadioGroup
                value={selectedAddressId || ""}
                onValueChange={handleAddressSelect}
              >
                <div className="grid gap-3">
                  {savedAddresses.map((address) => (
                    <Card
                      key={address.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/50",
                        selectedAddressId === address.id && "border-primary bg-primary/5"
                      )}
                      onClick={() => handleAddressSelect(address.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Home className="h-4 w-4" />
                                <span className="font-medium">
                                  {address.first_name} {address.last_name}
                                </span>
                                {address.is_default && (
                                  <Badge variant="secondary" className="text-xs">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <address className="text-sm text-muted-foreground not-italic space-y-0.5">
                                {address.address_1}
                                {address.address_2 && (
                                  <>
                                    <br />
                                    {address.address_2}
                                  </>
                                )}
                                <br />
                                {address.city}, {address.postal_code}
                                <br />
                                {address.country_code.toUpperCase()}
                              </address>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseNewAddress}
              className="font-mono text-xs uppercase tracking-wider"
            >
              <Plus className="h-4 w-4 mr-2" />
              Use a New Address
            </Button>
          </div>
        )}

        {/* New Address Form */}
        {(useSavedAddress === false || selectedAddressId === null) && (
          <div className="grid gap-2">
            <h3 className="font-medium">Shipping Address</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  {...register("first_name")}
                  className={cn(errors.first_name && "border-destructive")}
                />
                {errors.first_name && (
                  <span className="text-xs text-destructive">
                    {errors.first_name.message}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  {...register("last_name")}
                  className={cn(errors.last_name && "border-destructive")}
                />
                {errors.last_name && (
                  <span className="text-xs text-destructive">
                    {errors.last_name.message}
                  </span>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address_1">Address</Label>
              <Input
                id="address_1"
                placeholder="123 Lab St"
                {...register("address_1")}
                className={cn(errors.address_1 && "border-destructive")}
              />
              {errors.address_1 && (
                <span className="text-xs text-destructive">
                  {errors.address_1.message}
                </span>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address_2">Apartment, suite, etc. (optional)</Label>
              <Input id="address_2" {...register("address_2")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...register("city")}
                  className={cn(errors.city && "border-destructive")}
                />
                {errors.city && (
                  <span className="text-xs text-destructive">
                    {errors.city.message}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  {...register("postal_code")}
                  className={cn(errors.postal_code && "border-destructive")}
                />
                {errors.postal_code && (
                  <span className="text-xs text-destructive">
                    {errors.postal_code.message}
                  </span>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country_code">Country</Label>
              <Input
                id="country_code"
                {...register("country_code")}
                placeholder="US"
                className={cn(errors.country_code && "border-destructive")}
              />
              {errors.country_code && (
                <span className="text-xs text-destructive">
                  {errors.country_code.message}
                </span>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input id="phone" type="tel" {...register("phone")} />
            </div>
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="w-full font-mono uppercase tracking-widest"
        size="lg"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Continue to Delivery"}
      </Button>
    </form>
  )
}
