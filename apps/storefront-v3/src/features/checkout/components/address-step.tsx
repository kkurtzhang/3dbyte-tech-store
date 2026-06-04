"use client"

import { useState, useEffect, type KeyboardEvent } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { MeilisearchAddressDocument } from "@3dbyte-tech-store/shared-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Home, MapPin, Plus, User, UserPlus } from "lucide-react"
import { getAddressesAction, getSessionAction, CustomerAddress, AuthUser } from "@/app/actions/auth"
import { AuthSheet } from "@/features/auth/components/auth-sheet"
import { zodFormResolver } from "@/lib/forms/zod-form-resolver"
import { AddressAutocomplete } from "./address-autocomplete"

const addressSchema = z.object({
  email: z.string().email("Invalid email address"),
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  address_1: z.string().min(1, "Required"),
  address_2: z.string().optional(),
  city: z.string().min(1, "Required"),
  province: z.string().min(1, "Required"),
  postal_code: z.string().min(1, "Required"),
  country_code: z.string().min(2, "Required"), // Simplified for now
  phone: z.string().optional(),
  billing_address: z
    .object({
      first_name: z.string().min(1, "Required"),
      last_name: z.string().min(1, "Required"),
      address_1: z.string().min(1, "Required"),
      address_2: z.string().optional(),
      city: z.string().min(1, "Required"),
      province: z.string().min(1, "Required"),
      postal_code: z.string().min(1, "Required"),
      country_code: z.string().min(2, "Required"),
      phone: z.string().optional(),
    })
    .optional(),
})

type AddressFormData = z.infer<typeof addressSchema>
const addressResolver = zodFormResolver<AddressFormData>(addressSchema)
type CheckoutIdentityMode = "guest" | "account"
type AuthSheetMode = "login" | "register"
const NEW_ADDRESS_SELECTION = "__new_address__"

interface AddressStepProps {
  defaultValues?: Partial<AddressFormData>
  // eslint-disable-next-line no-unused-vars
  onComplete: (data: AddressFormData) => Promise<void> | void
}

function isDefaultCustomerAddress(address: CustomerAddress) {
  return Boolean(
    address.is_default ||
      address.is_default_shipping ||
      address.is_default_billing,
  )
}

function getAddressLabel(address: CustomerAddress) {
  const recipientName = `${address.first_name || ""} ${
    address.last_name || ""
  }`.trim()

  return address.address_name || recipientName || "Saved Address"
}

function customerAddressToCheckoutFields(address: CustomerAddress) {
  return {
    first_name: address.first_name || "",
    last_name: address.last_name || "",
    address_1: address.address_1 || "",
    address_2: address.address_2 || "",
    city: address.city || "",
    province: address.province || "",
    country_code: address.country_code || "au",
    postal_code: address.postal_code || "",
    phone: address.phone || "",
  }
}

function newAddressFormDefaults(
  authUser: AuthUser | null,
  defaultValues?: Partial<AddressFormData>
): Partial<AddressFormData> {
  return {
    email: authUser?.email || defaultValues?.email || "",
    first_name: authUser?.first_name || "",
    last_name: authUser?.last_name || "",
    address_1: "",
    address_2: "",
    city: "",
    province: "",
    country_code: "au",
    postal_code: "",
    phone: authUser?.phone || "",
    billing_address: undefined,
  }
}

export function AddressStep({ defaultValues, onComplete }: AddressStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [useSavedAddress, setUseSavedAddress] = useState(false)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [checkoutMode, setCheckoutMode] = useState<CheckoutIdentityMode | null>(null)
  const [authSheetMode, setAuthSheetMode] = useState<AuthSheetMode>("login")
  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false)
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true)
  const [joinEmailList, setJoinEmailList] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<AddressFormData>({
    resolver: addressResolver,
    defaultValues: {
      email: "",
      country_code: "au",
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
      const session = await getSessionAction()
      if (!session.success || !session.user) {
        setAuthUser(null)
        setCheckoutMode(null)
        setSavedAddresses([])
        return
      }

      setAuthUser(session.user)
      setCheckoutMode("account")
      reset({
        email: session.user.email || defaultValues?.email || "",
        first_name: session.user.first_name || defaultValues?.first_name || "",
        last_name: session.user.last_name || defaultValues?.last_name || "",
        country_code: defaultValues?.country_code || "au",
        ...defaultValues,
      })

      const result = await getAddressesAction()
      if (result.success) {
        setSavedAddresses(result.addresses)
        // Auto-select default address if available
        const defaultAddress = result.addresses.find(isDefaultCustomerAddress)
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id)
          setUseSavedAddress(true)
          applySavedAddressToForm(
            defaultAddress,
            session.user.email || defaultValues?.email || ""
          )
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
    setBillingSameAsShipping(true)
    const selectedAddress = savedAddresses.find((address) => address.id === addressId)

    if (selectedAddress) {
      applySavedAddressToForm(selectedAddress)
    }
  }

  const handleAddressSelectionChange = (value: string) => {
    if (value === NEW_ADDRESS_SELECTION) {
      handleUseNewAddress()
      return
    }

    handleAddressSelect(value)
  }

  const handleAddressSelectionKeyDown = (
    value: string,
    event: KeyboardEvent<HTMLDivElement>
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return
    }

    event.preventDefault()
    handleAddressSelectionChange(value)
  }

  const applySavedAddressToForm = (
    address: CustomerAddress,
    email = watch("email") || authUser?.email || defaultValues?.email || ""
  ) => {
    reset({
      email,
      ...customerAddressToCheckoutFields(address),
      billing_address: undefined,
    })
  }

  const handleAutocompleteValueChange = (value: string) => {
    setValue("address_1", value, { shouldValidate: true, shouldDirty: true })
  }

  const handleAutocompleteSelect = (address: MeilisearchAddressDocument) => {
    setValue("address_1", `${address.number} ${address.street}`.trim(), {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue("address_2", address.unit || "", {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue("city", address.suburb, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue("province", address.state, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue("postal_code", address.postcode, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue("country_code", address.country.toUpperCase(), {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  const handleBillingAutocompleteValueChange = (value: string) => {
    setValue("billing_address.address_1", value, {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  const handleBillingAutocompleteSelect = (address: MeilisearchAddressDocument) => {
    setValue("billing_address.address_1", `${address.number} ${address.street}`.trim(), {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue("billing_address.address_2", address.unit || "", {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue("billing_address.city", address.suburb, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue("billing_address.province", address.state, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue("billing_address.postal_code", address.postcode, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue("billing_address.country_code", address.country.toUpperCase(), {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  const handleUseNewAddress = () => {
    setSelectedAddressId(null)
    setUseSavedAddress(false)
    setBillingSameAsShipping(true)
    reset(newAddressFormDefaults(authUser, defaultValues))
  }

  const handleGuestCheckout = () => {
    setCheckoutMode("guest")
    setSelectedAddressId(null)
    setUseSavedAddress(false)
    reset({
      email: defaultValues?.email || "",
      country_code: "au",
      ...defaultValues,
    })
  }

  const handleChangeCheckoutMode = () => {
    setCheckoutMode(null)
    setSelectedAddressId(null)
    setUseSavedAddress(false)
    reset({
      email: defaultValues?.email || "",
      country_code: "au",
      ...defaultValues,
    })
  }

  const handleOpenAuthSheet = (mode: AuthSheetMode) => {
    setAuthSheetMode(mode)
    setIsAuthSheetOpen(true)
  }

  const handleBillingSameAsShippingChange = (checked: boolean) => {
    setBillingSameAsShipping(checked)
    if (!checked && !watch("billing_address.country_code")) {
      setValue("billing_address.country_code", "au", {
        shouldDirty: true,
        shouldValidate: false,
      })
    }
  }

  const handleAuthSuccess = () => {
    void loadSavedAddresses()
  }

  const joinEmailListIfRequested = async (email: string) => {
    if (!joinEmailList || !email.trim()) return

    try {
      await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })
    } catch (error) {
      console.warn("Newsletter opt-in failed during checkout", error)
    }
  }

  const onSubmit = async (data: AddressFormData) => {
    setIsSubmitting(true)
    try {
      const selectedAddress =
        useSavedAddress && selectedAddressId
          ? savedAddresses.find((addr) => addr.id === selectedAddressId)
          : null
      const shippingAddressData = selectedAddress
        ? {
            ...data,
            ...customerAddressToCheckoutFields(selectedAddress),
          }
        : data
      const checkoutAddressData = {
        ...shippingAddressData,
        billing_address: billingSameAsShipping ? undefined : data.billing_address,
      }

      await onComplete(checkoutAddressData)
      await joinEmailListIfRequested(checkoutAddressData.email)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canShowAddressForm = Boolean(authUser) || checkoutMode === "guest"

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-2">
        <h2 className="text-xl font-bold">Contact Information</h2>
        <p className="text-sm text-muted-foreground">
          Required for secure transmission of digital receipts.
        </p>
      </div>

      {!isLoadingAddresses && !authUser && checkoutMode === null && (
        <div className="grid gap-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-5 w-5 text-primary" />
              <div className="grid gap-2">
                <h3 className="font-medium">Continue as guest</h3>
                <p className="text-sm text-muted-foreground">
                  Use your email and delivery address without creating an account.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  onClick={handleGuestCheckout}
                >
                  Continue as guest
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenAuthSheet("login")}
            >
              <User className="mr-2 h-4 w-4" />
              Sign in
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenAuthSheet("register")}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create account
            </Button>
          </div>
        </div>
      )}

      {canShowAddressForm && (
        <div className="grid gap-4">
        {checkoutMode === "guest" && !authUser && (
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 text-sm">
            <span className="text-muted-foreground">
              Checking out as guest
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleChangeCheckoutMode}
            >
              Change method
            </Button>
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <Input
              id="email"
              type="email"
              placeholder="engineer@example.com"
              {...register("email")}
              className={cn(errors.email && "border-destructive")}
            />
            {checkoutMode === "guest" && !authUser ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
                <Checkbox
                  id="join_email_list"
                  checked={joinEmailList}
                  onCheckedChange={(checked) => setJoinEmailList(checked === true)}
                />
                <Label
                  htmlFor="join_email_list"
                  className="text-sm font-normal leading-snug"
                >
                  Join us for product updates
                </Label>
              </div>
            ) : null}
          </div>
          {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
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
              <div
                role="radiogroup"
                aria-label="Saved addresses"
                className="grid gap-3"
              >
                {savedAddresses.map((address) => {
                  const isSelected = selectedAddressId === address.id

                  return (
                    <div
                      key={address.id}
                      role="radio"
                      tabIndex={0}
                      aria-checked={isSelected}
                      className={cn(
                        "w-full rounded-lg border bg-card p-4 text-left text-card-foreground shadow-sm transition-colors hover:bg-muted/50",
                        isSelected && "border-primary bg-primary/5"
                      )}
                      onClick={() => handleAddressSelectionChange(address.id)}
                      onKeyDown={(event) =>
                        handleAddressSelectionKeyDown(address.id, event)
                      }
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-primary text-primary",
                              isSelected && "bg-primary"
                            )}
                          >
                            {isSelected && (
                              <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                            )}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Home className="h-4 w-4" />
                              <span className="font-medium">
                                {getAddressLabel(address)}
                              </span>
                              {isDefaultCustomerAddress(address) && (
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
                              {address.city}
                              {address.province ? `, ${address.province}` : ""}{" "}
                              {address.postal_code}
                              <br />
                              {address.country_code.toUpperCase()}
                            </address>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div
                  role="radio"
                  tabIndex={0}
                  aria-checked={selectedAddressId === null}
                  className={cn(
                    "w-full rounded-lg border bg-card p-4 text-left text-card-foreground shadow-sm transition-colors hover:bg-muted/50",
                    selectedAddressId === null && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleAddressSelectionChange(NEW_ADDRESS_SELECTION)}
                  onKeyDown={(event) =>
                    handleAddressSelectionKeyDown(NEW_ADDRESS_SELECTION, event)
                  }
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-primary text-primary",
                        selectedAddressId === null && "bg-primary"
                      )}
                    >
                      {selectedAddressId === null && (
                        <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                      )}
                    </span>
                    <div className="grid gap-1">
                      <div className="flex items-center gap-2 font-medium">
                        <Plus className="h-4 w-4" />
                        <span>Use a New Address</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enter a delivery address just for this checkout.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                  <span className="text-xs text-destructive">{errors.first_name.message}</span>
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
                  <span className="text-xs text-destructive">{errors.last_name.message}</span>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address_1">Address</Label>
              <input type="hidden" {...register("address_1")} />
              <AddressAutocomplete
                id="address_1"
                defaultValue={watch("address_1")}
                onValueChange={handleAutocompleteValueChange}
                onSelect={handleAutocompleteSelect}
                error={errors.address_1?.message}
                className={cn(errors.address_1 && "border-destructive")}
              />
              {errors.address_1 && (
                <span className="text-xs text-destructive">{errors.address_1.message}</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address_2">Apartment, suite, etc. (optional)</Label>
              <Input id="address_2" {...register("address_2")} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...register("city")}
                  className={cn(errors.city && "border-destructive")}
                />
                {errors.city && (
                  <span className="text-xs text-destructive">{errors.city.message}</span>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="province">State</Label>
                <Input
                  id="province"
                  {...register("province")}
                  placeholder="NSW"
                  className={cn(errors.province && "border-destructive")}
                />
                {errors.province && (
                  <span className="text-xs text-destructive">{errors.province.message}</span>
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
                  <span className="text-xs text-destructive">{errors.postal_code.message}</span>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country_code">Country</Label>
              <Input
                id="country_code"
                {...register("country_code")}
                placeholder="AU"
                className={cn(errors.country_code && "border-destructive")}
              />
              {errors.country_code && (
                <span className="text-xs text-destructive">{errors.country_code.message}</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input id="phone" type="tel" {...register("phone")} />
            </div>
          </div>
        )}

        <div className="grid gap-4 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="billing_same_as_shipping"
              checked={billingSameAsShipping}
              onCheckedChange={(checked) =>
                handleBillingSameAsShippingChange(checked === true)
              }
            />
            <Label htmlFor="billing_same_as_shipping">
              Billing address is same as shipping
            </Label>
          </div>

          {!billingSameAsShipping && (
            <fieldset className="grid gap-4">
              <legend className="font-medium">Billing Address</legend>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="billing_first_name">First Name</Label>
                  <Input
                    id="billing_first_name"
                    {...register("billing_address.first_name")}
                    className={cn(errors.billing_address?.first_name && "border-destructive")}
                  />
                  {errors.billing_address?.first_name && (
                    <span className="text-xs text-destructive">
                      {errors.billing_address.first_name.message}
                    </span>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billing_last_name">Last Name</Label>
                  <Input
                    id="billing_last_name"
                    {...register("billing_address.last_name")}
                    className={cn(errors.billing_address?.last_name && "border-destructive")}
                  />
                  {errors.billing_address?.last_name && (
                    <span className="text-xs text-destructive">
                      {errors.billing_address.last_name.message}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="billing_address_1">Address</Label>
                <input type="hidden" {...register("billing_address.address_1")} />
                <AddressAutocomplete
                  id="billing_address_1"
                  defaultValue={watch("billing_address.address_1")}
                  onValueChange={handleBillingAutocompleteValueChange}
                  onSelect={handleBillingAutocompleteSelect}
                  error={errors.billing_address?.address_1?.message}
                  className={cn(errors.billing_address?.address_1 && "border-destructive")}
                />
                {errors.billing_address?.address_1 && (
                  <span className="text-xs text-destructive">
                    {errors.billing_address.address_1.message}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="billing_address_2">Apartment, suite, etc. (optional)</Label>
                <Input
                  id="billing_address_2"
                  {...register("billing_address.address_2")}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="billing_city">City</Label>
                  <Input
                    id="billing_city"
                    {...register("billing_address.city")}
                    className={cn(errors.billing_address?.city && "border-destructive")}
                  />
                  {errors.billing_address?.city && (
                    <span className="text-xs text-destructive">
                      {errors.billing_address.city.message}
                    </span>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billing_province">State</Label>
                  <Input
                    id="billing_province"
                    placeholder="NSW"
                    {...register("billing_address.province")}
                    className={cn(errors.billing_address?.province && "border-destructive")}
                  />
                  {errors.billing_address?.province && (
                    <span className="text-xs text-destructive">
                      {errors.billing_address.province.message}
                    </span>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billing_postal_code">Postal Code</Label>
                  <Input
                    id="billing_postal_code"
                    {...register("billing_address.postal_code")}
                    className={cn(errors.billing_address?.postal_code && "border-destructive")}
                  />
                  {errors.billing_address?.postal_code && (
                    <span className="text-xs text-destructive">
                      {errors.billing_address.postal_code.message}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="billing_country_code">Country</Label>
                <Input
                  id="billing_country_code"
                  placeholder="AU"
                  {...register("billing_address.country_code")}
                  className={cn(errors.billing_address?.country_code && "border-destructive")}
                />
                {errors.billing_address?.country_code && (
                  <span className="text-xs text-destructive">
                    {errors.billing_address.country_code.message}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="billing_phone">Phone (Optional)</Label>
                <Input
                  id="billing_phone"
                  type="tel"
                  {...register("billing_address.phone")}
                />
              </div>
            </fieldset>
          )}
        </div>
      </div>
      )}

      {canShowAddressForm && (
        <Button
          type="submit"
          className="w-full font-mono uppercase tracking-widest"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Continue to Delivery"}
        </Button>
      )}

      <AuthSheet
        initialMode={authSheetMode}
        onOpenChange={setIsAuthSheetOpen}
        onSuccess={handleAuthSuccess}
        open={isAuthSheetOpen}
      />
    </form>
  )
}
