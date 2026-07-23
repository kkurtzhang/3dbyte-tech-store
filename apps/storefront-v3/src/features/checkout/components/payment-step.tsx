"use client"

import { useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard } from "lucide-react"
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"

interface PaymentStepProps {
  onBack: () => void
  onComplete: () => Promise<void> | void
  total: number
  currencyCode: string
}

export function PaymentStep({
  onBack,
  onComplete,
  total,
  currencyCode,
}: PaymentStepProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isProcessingRef = useRef(false)

  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isProcessingRef.current) return

    isProcessingRef.current = true
    setIsProcessing(true)
    setErrorMessage(null)

    try {
      if (!stripe || !elements) {
        throw new Error("Stripe not initialized")
      }

      const { error: submitError } = await elements.submit()
      if (submitError) {
        throw new Error(submitError.message)
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/confirmation`,
        },
        redirect: "if_required",
      })

      if (error) {
        throw new Error(error.message)
      }

      await onComplete()
    } catch (error: unknown) {
      console.error(error)
      setErrorMessage(
        error instanceof Error ? error.message : "Payment processing failed"
      )
    } finally {
      isProcessingRef.current = false
      setIsProcessing(false)
    }
  }

  const normalizedCurrency = currencyCode.toUpperCase()
  const regionalPrefix =
    normalizedCurrency === "AUD"
      ? "A$"
      : normalizedCurrency === "NZD"
        ? "NZ$"
        : null
  const formattedTotal = regionalPrefix
    ? `${regionalPrefix}${new Intl.NumberFormat("en-AU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(total)}`
    : new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: normalizedCurrency,
      }).format(total)
  const paymentLabel = `Pay ${formattedTotal} now`

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isProcessing}>
      {isProcessing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="rounded-lg border bg-card px-6 py-5 text-center shadow-lg">
            <p className="font-mono text-sm uppercase tracking-widest">
              Finalising your payment
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Please keep this page open while we confirm your order.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <h2 className="text-xl font-bold">Payment</h2>
        <p className="text-sm text-muted-foreground">
          Enter your payment details to complete the order.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="flex w-full items-center gap-4 rounded-lg border border-primary bg-primary/5 p-4 text-left ring-1 ring-primary">
          <CreditCard className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h3 className="font-mono font-bold text-sm uppercase">Credit Card</h3>
            <p className="text-xs text-muted-foreground">
              Pay securely with your credit or debit card
            </p>
          </div>
          <div className="flex h-4 w-4 items-center justify-center rounded-full border border-primary bg-primary">
            <div className="h-2 w-2 rounded-full bg-background" />
          </div>
        </div>

        <div className="rounded-md border border-dashed p-4 space-y-4 bg-muted/20">
             {stripe ? (
                <PaymentElement
                  options={{
                    layout: "tabs",
                  }}
                />
             ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground font-mono text-sm">
                   Initializing secure payment...
                </div>
             )}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-mono">
          Error: {errorMessage}
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
        >
          Back
        </Button>
        <Button
          type="submit"
          className="flex-1 font-mono uppercase tracking-widest"
          size="lg"
          disabled={isProcessing || !stripe}
          aria-label={isProcessing ? `${paymentLabel}, finalising payment` : paymentLabel}
        >
          {isProcessing ? "Finalising..." : paymentLabel}
        </Button>
      </div>
    </form>
  )
}
