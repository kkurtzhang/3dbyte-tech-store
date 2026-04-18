"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Truck, Zap, Package, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getShippingOptionsAction,
  getLiveShippingRatesAction,
} from "@/app/actions/checkout"
import type { ShippingRate } from "@/lib/medusa/shipping"

interface DeliveryOption {
  id: string
  title: string
  description: string
  price: number
  icon: React.ElementType
}

interface DeliveryStepProps {
  onBack: () => void
  onComplete: (methodId: string) => Promise<void> | void
}

function formatCarrierName(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
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

function groupRatesByCarrier(
  rates: ShippingRate[]
): Record<string, ShippingRate[]> {
  const groups: Record<string, ShippingRate[]> = {}
  for (const rate of rates) {
    const key = rate.carrier.name
    const existing = groups[key] ?? []
    groups[key] = [...existing, rate]
  }
  return groups
}

export function DeliveryStep({ onBack, onComplete }: DeliveryStepProps) {
  const [selectedId, setSelectedId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [options, setOptions] = useState<DeliveryOption[]>([])
  const [liveRates, setLiveRates] = useState<ShippingRate[]>([])
  const [isLoadingLiveRates, setIsLoadingLiveRates] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOptions() {
      try {
        setIsLoading(true)
        setIsLoadingLiveRates(true)

        const [medusaResult, liveResult] = await Promise.all([
          getShippingOptionsAction(),
          getLiveShippingRatesAction(),
        ])

        // Process live Karrio rates
        if (liveResult.success && liveResult.rates.length > 0) {
          setLiveRates(liveResult.rates)
          setSelectedId(liveResult.rates[0].id)
        }

        // Process Medusa flat-rate options as fallback
        if (medusaResult.success && medusaResult.options.length > 0) {
          const transformedOptions: DeliveryOption[] =
            medusaResult.options.map((opt: Record<string, unknown>) => ({
              id: opt.id as string,
              title: (opt.name as string) || (opt.id as string),
              description:
                (opt.description as string) || "Standard shipping",
              price: (opt.amount as number) || 0,
              icon:
                typeof opt.amount === "number" && opt.amount > 1000
                  ? Zap
                  : Truck,
            }))
          setOptions(transformedOptions)

          // Only auto-select Medusa option if no live rates
          if (!liveResult.success || liveResult.rates.length === 0) {
            if (transformedOptions.length > 0) {
              setSelectedId(transformedOptions[0].id)
            }
          }
        } else if (!liveResult.success || liveResult.rates.length === 0) {
          // No live rates and no Medusa options -- use defaults
          setOptions(DEFAULT_OPTIONS)
          setSelectedId("standard")
        }
      } catch {
        setOptions(DEFAULT_OPTIONS)
        setSelectedId("standard")
      } finally {
        setIsLoading(false)
        setIsLoadingLiveRates(false)
      }
    }
    loadOptions()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId) return
    setIsSubmitting(true)
    try {
      await onComplete(selectedId)
    } finally {
      setIsSubmitting(false)
    }
  }

  const carrierGroups = groupRatesByCarrier(liveRates)
  const hasLiveRates = liveRates.length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <h2 className="text-xl font-bold">Delivery Method</h2>
        <p className="text-sm text-muted-foreground">
          Choose how you want your order shipped.
        </p>
      </div>

      {isLoading ? (
        <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          {isLoadingLiveRates && (
            <p className="text-xs text-muted-foreground animate-pulse">
              Fetching live rates from carriers...
            </p>
          )}
        </div>
      ) : error ? (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <RadioGroup
          value={selectedId}
          onValueChange={setSelectedId}
          className="grid gap-4"
        >
          {/* Live Karrio rates grouped by carrier */}
          {hasLiveRates &&
            Object.entries(carrierGroups).map(
              ([carrierName, rates]) => (
                <div key={carrierName} className="space-y-2">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    {formatCarrierName(carrierName)}
                  </p>
                  {rates.map((rate) => (
                    <LiveRateCard key={rate.id} rate={rate} />
                  ))}
                </div>
              )
            )}

          {/* Medusa flat-rate options (shown when no live rates, or as fallback section) */}
          {!hasLiveRates &&
            options.map((option) => (
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
                          : `$${(option.price / 100).toFixed(2)}`}
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

function LiveRateCard({ rate }: { rate: ShippingRate }) {
  return (
    <div>
      <RadioGroupItem
        value={rate.id}
        id={rate.id}
        className="peer sr-only"
      />
      <Label
        htmlFor={rate.id}
        className={cn(
          "flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-all",
          "hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-primary"
        )}
      >
        <Truck className="h-6 w-6 text-primary" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-mono font-bold text-sm uppercase">
              {rate.serviceName || rate.service}
            </h3>
            <span className="font-mono text-sm">
              {rate.totalCharge === 0
                ? "FREE"
                : `$${(rate.totalCharge / 100).toFixed(2)}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {buildLiveRateDescription(rate)}
          </p>
        </div>
      </Label>
    </div>
  )
}

// Fallback options when Medusa API is not available
const DEFAULT_OPTIONS: DeliveryOption[] = [
  {
    id: "standard",
    title: "Standard Ground",
    description: "3-5 business days. Reliable transport.",
    price: 0,
    icon: Truck,
  },
  {
    id: "express",
    title: "Express Air",
    description: "1-2 business days. Priority handling.",
    price: 1500,
    icon: Zap,
  },
  {
    id: "freight",
    title: "Heavy Freight",
    description: "5-7 business days. For bulk equipment.",
    price: 5000,
    icon: Package,
  },
]
