"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Clock3, Loader2, MapPin, Truck, Zap } from "lucide-react"
import { estimateProductShippingAction } from "@/app/actions/product-shipping"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/components/ui/price-display"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { searchLocalities } from "@/lib/search/localities"
import {
  getLocalitySuggestionsFromLocalities,
  getPrimaryShippingEstimate,
  inferAustralianStateFromPostcode,
  isValidAustralianPostcode,
  normalizeLocalityInput,
  normalizePostcodeInput,
  parseShippingDestinationInput,
  type ProductShippingLocalitySuggestion,
  type ProductShippingEstimateOption,
} from "../lib/product-shipping-estimate"

const DESTINATION_STORAGE_KEY = "3dbyte-product-shipping-destination"

interface ProductShippingEstimateProps {
  variantId?: string | null
  items?: {
    variantId: string
    quantity: number
  }[]
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
  items,
  variantId,
}: ProductShippingEstimateProps) {
  const isDestinationFocusedRef = useRef(false)
  const estimateIdentityRef = useRef<string | null>(null)
  const [destination, setDestination] = useState("")
  const [selectedLocality, setSelectedLocality] =
    useState<ProductShippingLocalitySuggestion | null>(null)
  const [localitySuggestions, setLocalitySuggestions] = useState<
    ProductShippingLocalitySuggestion[]
  >([])
  const [showLocalitySuggestions, setShowLocalitySuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<ShippingEstimateState>(null)
  const [isPending, startTransition] = useTransition()
  const debouncedDestination = useDebounce(destination, 300)
  const estimateIdentity = useMemo(() => {
    if (items?.length) {
      return items
        .map((item) => `${item.variantId}:${item.quantity}`)
        .sort()
        .join("|")
    }

    return variantId || ""
  }, [items, variantId])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const savedDestination = window.localStorage.getItem(DESTINATION_STORAGE_KEY)

    if (savedDestination) {
      setDestination(savedDestination)
    }
  }, [])

  useEffect(() => {
    if (estimateIdentityRef.current === null) {
      estimateIdentityRef.current = estimateIdentity
      return
    }

    if (estimateIdentityRef.current === estimateIdentity) {
      return
    }

    estimateIdentityRef.current = estimateIdentity
    isDestinationFocusedRef.current = false
    setSelectedLocality(null)
    setLocalitySuggestions([])
    setShowLocalitySuggestions(false)
    setError(null)
    setEstimate(null)
  }, [estimateIdentity])

  const primaryOption = useMemo(
    () => getPrimaryShippingEstimate(estimate?.options || []),
    [estimate]
  )
  const hasEstimateItems = Boolean(variantId || items?.length)

  useEffect(() => {
    let isCurrent = true
    const normalizedDestination = normalizeLocalityInput(debouncedDestination)
    const parsedDestination = parseShippingDestinationInput(normalizedDestination)
    const normalizedPostcode = normalizePostcodeInput(parsedDestination.postalCode)

    if (normalizedDestination.length < 3) {
      setLocalitySuggestions([])
      return () => {
        isCurrent = false
      }
    }

    searchLocalities(normalizedDestination, 8, { country: "AU" }).then(
      (result) => {
        if (!isCurrent) {
          return
        }

        const suggestions = getLocalitySuggestionsFromLocalities(
          result.localities,
          isValidAustralianPostcode(normalizedPostcode)
            ? normalizedPostcode
            : undefined
        )

        setLocalitySuggestions(suggestions)
        setShowLocalitySuggestions(
          isDestinationFocusedRef.current && suggestions.length > 0
        )
      }
    )

    return () => {
      isCurrent = false
    }
  }, [debouncedDestination])

  const handleDestinationChange = (value: string) => {
    isDestinationFocusedRef.current = true
    setDestination(value)
    setSelectedLocality(null)
    setShowLocalitySuggestions(
      isDestinationFocusedRef.current && value.trim().length >= 3
    )
  }

  const selectLocality = (suggestion: ProductShippingLocalitySuggestion) => {
    isDestinationFocusedRef.current = false
    setDestination(suggestion.label)
    setSelectedLocality(suggestion)
    setShowLocalitySuggestions(false)
    setError(null)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!hasEstimateItems) {
      setError("Select your options to unlock a live postcode estimate.")
      return
    }

    const parsedDestination = selectedLocality
      ? {
          postalCode: selectedLocality.postcode,
          locality: selectedLocality.suburb,
        }
      : parseShippingDestinationInput(destination)
    const normalizedPostcode = normalizePostcodeInput(parsedDestination.postalCode)
    const normalizedLocality = normalizeLocalityInput(parsedDestination.locality)

    if (!isValidAustralianPostcode(normalizedPostcode)) {
      setError("Enter a valid 4-digit Australian postcode.")
      return
    }

    if (!normalizedLocality) {
      setError("Enter the delivery suburb or locality.")
      return
    }

    setError(null)

    startTransition(async () => {
      const province =
        selectedLocality?.state || inferAustralianStateFromPostcode(normalizedPostcode)

      const result = await estimateProductShippingAction({
        ...(items?.length ? { items } : { variantId }),
        postalCode: normalizedPostcode,
        countryCode: "au",
        city: normalizedLocality,
        province,
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
        window.localStorage.setItem(
          DESTINATION_STORAGE_KEY,
          selectedLocality?.label || `${normalizedLocality} ${normalizedPostcode}`
        )
      }
    })
  }

  return (
    <div className="rounded-sm border border-border/70 bg-muted/20 p-4">
      <div className="space-y-2">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          Shipping Estimate
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          Enter your suburb and postcode for a live postage estimate on this item.
        </p>
      </div>

      <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
        <label className="grid flex-1 gap-2 text-sm font-medium text-foreground">
          <span>Suburb or postcode</span>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Suburb or postcode"
              aria-autocomplete="list"
              aria-expanded={showLocalitySuggestions}
              className="pl-9"
              maxLength={100}
              onBlur={() => {
                isDestinationFocusedRef.current = false
                setShowLocalitySuggestions(false)
              }}
              onChange={(event) => handleDestinationChange(event.target.value)}
              onFocus={() => {
                isDestinationFocusedRef.current = true
                setShowLocalitySuggestions(
                  destination.trim().length >= 3 && localitySuggestions.length > 0
                )
              }}
              placeholder="Wollongong 2500"
              role="combobox"
              value={destination}
            />
            {showLocalitySuggestions && (
              <div
                className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-sm border bg-popover p-1 text-sm shadow-md"
                role="listbox"
              >
                {localitySuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    className="flex w-full items-center rounded-sm px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                    onMouseDown={(event) => {
                      event.preventDefault()
                    }}
                    onClick={() => selectLocality(suggestion)}
                    role="option"
                    type="button"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>

        <Button
          className="sm:self-end"
          disabled={!hasEstimateItems || isPending}
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

      {!hasEstimateItems && (
        <p className="mt-3 text-sm text-muted-foreground">
          Select your options to unlock a live postcode estimate.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {estimate && primaryOption && (
        <div className="mt-4 space-y-3">
          <div className="rounded-sm border border-border/70 bg-background px-4 py-3">
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
                  className="flex items-start gap-3 rounded-sm border border-border/70 bg-background px-4 py-3"
                >
                  <div className="mt-0.5 rounded-sm bg-secondary/50 p-2 text-foreground">
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

      <div className="mt-4 flex items-start gap-3 rounded-sm border border-border/70 bg-background/80 px-4 py-3">
        <div className="mt-0.5 rounded-sm bg-secondary/50 p-2 text-foreground">
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
