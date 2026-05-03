"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Truck, Zap, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getShippingServiceDisplayName } from "@/lib/shipping/display-name"
import {
  getShippingOptionsAction,
  getLiveShippingRatesAction,
} from "@/app/actions/checkout"
import type { ShippingRate } from "@/lib/medusa/shipping"

interface DeliveryOption {
  id: string
  optionId: string
  title: string
  description: string
  price: number
  data?: Record<string, unknown>
  icon: React.ElementType
}

interface DeliveryStepProps {
  onBack: () => void
  onComplete: (
    methodId: string,
    data?: Record<string, unknown>,
    summary?: { name: string; price: number }
  ) => Promise<void> | void
  onSelectedEstimateChange?: (amount: number | null) => void
}

function buildLiveRateDescription(rate: ShippingRate): string {
  const parts: string[] = []
  if (rate.transitDays) {
    parts.push(
      `${rate.transitDays} business day${rate.transitDays > 1 ? "s" : ""}`
    )
  }
  if (rate.estimatedDeliveryDate) {
    parts.push(`Est. ${rate.estimatedDeliveryDate}`)
  }
  return parts.length > 0 ? parts.join(" \u00b7 ") : "Carrier-calculated rate"
}

function formatShippingOptionAmount(amount: number) {
  return amount
}

function liveRateToDeliveryOption(
  optionId: string,
  rate: ShippingRate
): DeliveryOption {
  const title = getShippingServiceDisplayName({
    carrierName: rate.carrier.name,
    service: rate.service,
    serviceName: rate.serviceName,
  })
  const price = rate.totalCharge / 100

  return {
    id: `${optionId}:${rate.id}`,
    optionId,
    title,
    description: buildLiveRateDescription(rate),
    price,
    data: {
      selected_rate_id: rate.id,
      service: rate.service,
      service_name: rate.serviceName,
      carrier_id: rate.carrier.id,
      carrier_name: rate.carrier.name,
    },
    icon: price > 10 ? Zap : Truck,
  }
}

export function DeliveryStep({
  onBack,
  onComplete,
  onSelectedEstimateChange,
}: DeliveryStepProps) {
  const [selectedId, setSelectedId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [options, setOptions] = useState<DeliveryOption[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOptions() {
      try {
        setIsLoading(true)
        setError(null)

        const [medusaResult, liveRateResult] = await Promise.all([
          getShippingOptionsAction(),
          getLiveShippingRatesAction(),
        ])
        const fetchedLiveRates = liveRateResult.success ? liveRateResult.rates : []

        if (medusaResult.success && medusaResult.options.length > 0) {
          const calculatedOption = medusaResult.options.find(
            (opt) => opt?.price_type === "calculated"
          )
          const liveRateOptions =
            calculatedOption && fetchedLiveRates.length > 0
              ? fetchedLiveRates.map((rate) =>
                  liveRateToDeliveryOption(calculatedOption.id, rate)
                )
              : []
          const medusaOptions: DeliveryOption[] = medusaResult.options.flatMap(
            (opt) => {
              if (!opt || (liveRateOptions.length > 0 && opt.price_type === "calculated")) {
                return []
              }

              return [
                {
                  id: opt.id,
                  optionId: opt.id,
                  title: getShippingServiceDisplayName({
                    description: opt.description,
                    name: opt.name || opt.id,
                  }),
                  description: opt.description || "Standard shipping",
                  price: opt.amount,
                  icon: opt.amount > 10 ? Zap : Truck,
                },
              ]
            }
          )
          const transformedOptions = [...liveRateOptions, ...medusaOptions]
          setOptions(transformedOptions)

          if (transformedOptions.length > 0) {
            setSelectedId(transformedOptions[0].id)
            onSelectedEstimateChange?.(
              formatShippingOptionAmount(transformedOptions[0].price)
            )
          }
        } else {
          setOptions([])
          setSelectedId("")
          onSelectedEstimateChange?.(null)
          setError(
            medusaResult.success
              ? "No shipping methods are available for this address."
              : medusaResult.error || "Unable to calculate postage"
          )
        }
      } catch {
        setOptions([])
        setSelectedId("")
        onSelectedEstimateChange?.(null)
        setError("Unable to load shipping methods. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    loadOptions()
  }, [onSelectedEstimateChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId) return
    const selectedOption = options.find((option) => option.id === selectedId)
    if (!selectedOption) return

    setIsSubmitting(true)
    try {
      await onComplete(selectedOption.optionId, selectedOption.data, {
        name: selectedOption.title,
        price: selectedOption.price,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectedIdChange = (nextSelectedId: string) => {
    setSelectedId(nextSelectedId)
    const selectedOption = options.find((option) => option.id === nextSelectedId)
    onSelectedEstimateChange?.(
      selectedOption ? formatShippingOptionAmount(selectedOption.price) : null
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <h2 className="text-xl font-bold">Delivery Method</h2>
        <p className="text-sm text-muted-foreground">
          Choose how you want your order shipped.
        </p>
      </div>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center gap-3 py-12"
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <RadioGroup
          value={selectedId}
          onValueChange={handleSelectedIdChange}
          className="grid gap-4"
        >
          {options.map((option) => (
            <div key={option.id}>
              <RadioGroupItem
                value={option.id}
                id={option.id}
                className="peer sr-only"
              />
              <Label
                htmlFor={option.id}
                className={cn(
                  "flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-all",
                  "hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-primary"
                )}
              >
                <option.icon className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono font-bold text-sm uppercase">
                      {option.title}
                    </h3>
                    <span className="font-mono text-sm">
                      {option.price === 0
                        ? "INCLUDED"
                        : `$${option.price.toFixed(2)}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          type="submit"
          className="flex-1 font-mono uppercase tracking-widest"
          size="lg"
          disabled={isSubmitting || isLoading || !selectedId}
        >
          {isSubmitting ? "Saving..." : "Continue to Payment"}
        </Button>
      </div>
    </form>
  )
}
