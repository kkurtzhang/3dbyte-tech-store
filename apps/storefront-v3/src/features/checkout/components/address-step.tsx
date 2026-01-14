"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      email: "",
      country_code: "us",
      ...defaultValues,
    },
  })

  const onSubmit = async (data: AddressFormData) => {
    setIsSubmitting(true)
    try {
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
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input id="phone" type="tel" {...register("phone")} />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full font-mono uppercase tracking-widest"
        size="lg"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Verifying_Data..." : "Proceed_To_Logistics"}
      </Button>
    </form>
  )
}
