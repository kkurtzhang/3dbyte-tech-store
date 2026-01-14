"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"

interface PaymentStepProps {
  onBack: () => void
  onComplete: () => Promise<void> | void
}

export function PaymentStep({ onBack, onComplete }: PaymentStepProps) {
  const [method, setMethod] = useState<"card" | "manual">("card")
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setErrorMessage(null)

    try {
      if (method === "card") {
        if (!stripe || !elements) {
          throw new Error("Stripe not initialized")
        }

        // Trigger form validation and wallet collection
        const { error: submitError } = await elements.submit()
        if (submitError) {
          throw new Error(submitError.message)
        }

        // Confirm the payment
        // We use redirect: 'if_required' to handle success in-place if possible,
        // but typically for complex flows we might just let it redirect.
        // For this single-page flow, we'll try to keep it here.
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/checkout/confirmation`,
          },
          redirect: 'if_required',
        })

        if (error) {
          throw new Error(error.message)
        }
      }

      // If manual or successful stripe payment (no redirect happened)
      await onComplete()

    } catch (error: any) {
      console.error(error)
      setErrorMessage(error.message || "Payment processing failed")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <h2 className="text-xl font-bold">Transaction Method</h2>
        <p className="text-sm text-muted-foreground">
          Select encrypted payment channel.
        </p>
      </div>

      <div className="grid gap-4">
        <div
          className={cn(
            "flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-all",
            method === "card"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "hover:border-primary/50"
          )}
          onClick={() => setMethod("card")}
        >
          <CreditCard className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h3 className="font-mono font-bold text-sm uppercase">Secure Card Protocol</h3>
            <p className="text-xs text-muted-foreground">
              Encrypted transmission via Stripe
            </p>
          </div>
          <div className={cn(
            "h-4 w-4 rounded-full border border-primary flex items-center justify-center",
            method === "card" && "bg-primary"
          )}>
            {method === "card" && <div className="h-2 w-2 rounded-full bg-background" />}
          </div>
        </div>

        {/* Stripe Payment Element */}
        {method === "card" && (
          <div className="rounded-md border border-dashed p-4 space-y-4 bg-muted/20">
             {stripe ? (
                <PaymentElement
                  options={{
                    layout: "tabs",
                  }}
                />
             ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground font-mono text-sm">
                   INITIALIZING_SECURE_LINK...
                </div>
             )}
          </div>
        )}

        <div
          className={cn(
            "flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-all",
            method === "manual"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "hover:border-primary/50"
          )}
          onClick={() => setMethod("manual")}
        >
          <Wallet className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h3 className="font-mono font-bold text-sm uppercase">Manual Transfer</h3>
            <p className="text-xs text-muted-foreground">
              Direct wire to laboratory accounts
            </p>
          </div>
           <div className={cn(
              "h-4 w-4 rounded-full border border-primary flex items-center justify-center",
              method === "manual" && "bg-primary"
          )}>
              {method === "manual" && <div className="h-2 w-2 rounded-full bg-background" />}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-mono">
          ERROR: {errorMessage}
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
          disabled={isProcessing || (method === "card" && !stripe)}
        >
          {isProcessing ? "Processing_Transaction..." : "Authorize_Payment"}
        </Button>
      </div>
    </form>
  )
}
