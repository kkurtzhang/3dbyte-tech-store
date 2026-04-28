"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Clock3, Loader2, MapPin, Truck, Zap } from "lucide-react"
import { estimateProductShippingAction } from "@/app/actions/product-shipping"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/components/ui/price-display"
import {
  getPrimaryShippingEstimate,
  isValidAustralianPostcode,
  normalizePostcodeInput,
  type ProductShippingEstimateOption,
} from "../lib/product-shipping-estimate"

const POSTCODE_STORAGE_KEY = "3dbyte-product-shipping-postcode"

interface ProductShippingEstimateProps {
  variantId?: string | null
}

type ShippingEstimateState =
  | {
      postcode: string
      options: ProductShippingEstimateOption[]
    }
  | null

function getShippingOptionIcon(name: string) {
  if (/express|priority|overnight/i.test(name)) {
    return Zap
  }

  return Truck
}

export function ProductShippingEstimate({
  variantId,
}: ProductShippingEstimateProps) {
  const [postcode, setPostcode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<ShippingEstimateState>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const savedPostcode = window.localStorage.getItem(POSTCODE_STORAGE_KEY)

    if (savedPostcode) {
      setPostcode(savedPostcode)
    }
  }, [])

  const primaryOption = useMemo(
    () => getPrimaryShippingEstimate(estimate?.options || []),
    [estimate]
  )

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!variantId) {
      setError("Select your options to unlock a live postcode estimate.")
      return
    }

    const normalizedPostcode = normalizePostcodeInput(postcode)

    if (!isValidAustralianPostcode(normalizedPostcode)) {
      setError("Enter a valid 4-digit Australian postcode.")
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await estimateProductShippingAction({
        variantId,
        postalCode: normalizedPostcode,
        countryCode: "au",
      })

      if (!result.success) {
        setEstimate(null)
        setError(result.error)
        return
      }

      setEstimate({
        postcode: result.postcode,
        options: result.options,
      })

      if (typeof window !== "undefined") {
        window.localStorage.setItem(POSTCODE_STORAGE_KEY, result.postcode)
      }
    })
  }

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="space-y-2">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          Shipping Estimate
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          Enter your Australian postcode for a live postage estimate on this item.
        </p>
      </div>

      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
        <label className="grid flex-1 gap-2 text-sm font-medium text-foreground">
          <span>Postcode</span>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Postcode"
              className="pl-9 font-mono"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => setPostcode(event.target.value)}
              placeholder="7000"
              value={postcode}
            />
          </div>
        </label>

        <Button
          className="sm:self-end"
          disabled={!variantId || isPending}
          type="submit"
          variant="outline"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            "Check Postage"
          )}
        </Button>
      </form>

      {!variantId && (
        <p className="mt-3 text-sm text-muted-foreground">
          Select your options to unlock a live postcode estimate.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {estimate && primaryOption && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-border/70 bg-background px-4 py-3">
            <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Shipping to {estimate.postcode}
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              From {formatPrice(primaryOption.amount, primaryOption.currencyCode.toUpperCase())}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {primaryOption.name} for this product and postcode.
            </p>
          </div>

          <div className="grid gap-3">
            {estimate.options.map((option) => {
              const Icon = getShippingOptionIcon(option.name)

              return (
                <div
                  key={option.id}
                  className="flex items-start gap-3 rounded-lg border border-border/70 bg-background px-4 py-3"
                >
                  <div className="mt-0.5 rounded-md bg-secondary/50 p-2 text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {option.name}
                      </p>
                      {option.priceType === "calculated" && (
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          Calculated live
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {option.description}
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-foreground">
                    {formatPrice(option.amount, option.currencyCode.toUpperCase())}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-start gap-3 rounded-lg border border-border/70 bg-background/80 px-4 py-3">
        <div className="mt-0.5 rounded-md bg-secondary/50 p-2 text-foreground">
          <Clock3 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Dispatch estimate</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Orders usually leave our warehouse in 1-2 business days once paid.
          </p>
        </div>
      </div>
    </div>
  )
}
