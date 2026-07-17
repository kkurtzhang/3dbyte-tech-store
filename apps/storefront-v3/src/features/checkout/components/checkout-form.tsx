"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AddressStep } from "./address-step"
import { DeliveryStep } from "./delivery-step"
import { PaymentStep } from "./payment-step"
import { CheckoutSummary } from "./checkout-summary"
import { CheckoutStepper, type CheckoutStepId } from "./checkout-stepper"
import { StripeWrapper } from "./stripe-wrapper"

import {
  setAddressesAction,
  setShippingMethodAction,
  completeCartAction,
  initPaymentSessionAction,
} from "@/app/actions/checkout"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { useCart } from "@/context/cart-context"
import type { MedusaCart } from "@/lib/medusa/cart"
import { useCheckoutSummaryEstimate } from "./checkout-summary-estimate-context"

interface CheckoutFormProps {
  cart: MedusaCart
}

// Checkout flow: shipping → delivery → payment → confirmation
type CheckoutFlowStep = "shipping" | "delivery" | "payment"

export function CheckoutForm({ cart }: CheckoutFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { cart: liveCart, clearCart, refreshCart } = useCart()
  const checkoutSummaryEstimate = useCheckoutSummaryEstimate()
  const [currentStep, setCurrentStep] = useState<CheckoutFlowStep>("shipping")

  // Track completed steps for navigation
  const [completedSteps, setCompletedSteps] = useState<CheckoutStepId[]>([])

  // Form Data State
  const [addressData, setAddressData] = useState<any>(null)
  const [clientSecret, setClientSecret] = useState<string | undefined>(undefined)
  
  const findStripeClientSecret = (paymentCollection: any) => {
    const paymentSession = paymentCollection?.payment_sessions?.find(
      (session: any) =>
        session.provider_id === "stripe" ||
        session.provider_id?.includes("stripe")
    )

    return typeof paymentSession?.data?.client_secret === "string"
      ? paymentSession.data.client_secret
      : undefined
  }

  // Handle step navigation from stepper - allow going back to completed steps
  const handleStepClick = (stepId: CheckoutStepId) => {
    if (stepId === "confirmation") return
    
    const stepOrder: CheckoutStepId[] = ["shipping", "delivery", "payment", "confirmation"]
    const currentIndex = stepOrder.indexOf(currentStep)
    const clickedIndex = stepOrder.indexOf(stepId)
    
    // Only allow navigating backward to completed steps
    if (clickedIndex < currentIndex) {
      setCurrentStep(stepId as CheckoutFlowStep)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleAddressComplete = async (data: any) => {
    try {
      const result = await setAddressesAction(data)
      if (result.success) {
        checkoutSummaryEstimate?.setEstimatedShippingTotal(null)
        setAddressData(data)
        setCompletedSteps((prev) => [...prev, "shipping"])
        setCurrentStep("delivery")
        await refreshCart()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        toast({
          variant: "destructive",
          title: "Address Error",
          description: result.error || "Failed to save address. Please try again.",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Unable to save address. Please check your connection and try again.",
      })
    }
  }

  const handleDeliveryComplete = async (
    methodId: string,
    data?: Record<string, unknown>
  ) => {
    try {
      const result = await setShippingMethodAction(methodId, data)
      if (result.success) {
        await refreshCart()

        // Initialize payment session
        const sessionResult = await initPaymentSessionAction()
        if (sessionResult.success) {
          const nextClientSecret = findStripeClientSecret(
            sessionResult.paymentCollection
          )
          if (!nextClientSecret) {
            toast({
              variant: "destructive",
              title: "Payment Setup Error",
              description:
                "Payment setup did not return a Stripe client secret. Please try the delivery method again.",
            })
            return
          }
          setClientSecret(nextClientSecret)

          // Mark delivery step as completed, move to payment
          setCompletedSteps((prev) => [...prev, "delivery"])
          setCurrentStep("payment")
          await refreshCart()
          window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
          toast({
            variant: "destructive",
            title: "Payment Setup Error",
            description: sessionResult.error || "Failed to initialize payment. Please try again.",
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "Delivery Error",
          description: result.error || "Failed to set delivery method. Please try again.",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Unable to save delivery method. Please check your connection and try again.",
      })
    }
  }

  const handlePaymentComplete = async () => {
    setCompletedSteps((prev) => [...prev, "payment"])
    await handlePlaceOrder()
  }

  const handlePlaceOrder = async () => {
    try {
      const result = await completeCartAction()
      if (result.success && result.order) {
        setCompletedSteps((prev) => [...prev, "confirmation"])
        clearCart()
        // Redirect to confirmation page
        if (result.order.id) {
          router.push(`/order/confirmed/${result.order.id}`)
        } else {
          router.push("/order/confirmed")
        }
      } else {
        toast({
          variant: "destructive",
          title: "Order Failed",
          description: result.error || "Failed to complete order. Please try again.",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Unable to complete order. Please check your connection and try again.",
      })
    }
  }

  // Get the current step ID for the stepper
  const getCurrentStepId = (): CheckoutStepId => {
    return currentStep
  }

  // Handle going back from a step
  const goBack = () => {
    const stepOrder: CheckoutFlowStep[] = ["shipping", "delivery", "payment"]
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      const prevStep = stepOrder[currentIndex - 1]
      setCurrentStep(prevStep)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-8">
      {/* Checkout Progress Stepper */}
      <CheckoutStepper
        currentStep={getCurrentStepId()}
        onStepClick={handleStepClick}
        completedSteps={completedSteps}
      />

      {/* Step Content */}
      <div className="rounded-lg border bg-card p-6 md:p-8 shadow-sm">
        {currentStep === "shipping" && (
          <AddressStep
            onComplete={handleAddressComplete}
            defaultValues={addressData || { email: cart.email }}
          />
        )}

        {currentStep === "delivery" && (
          <DeliveryStep
            onBack={goBack}
            onComplete={handleDeliveryComplete}
            onSelectedEstimateChange={
              checkoutSummaryEstimate?.setEstimatedShippingTotal
            }
          />
        )}

        {currentStep === "payment" && (
          <div className="space-y-6">
            <details className="rounded-lg border bg-muted/20 lg:hidden">
              <summary className="cursor-pointer px-4 py-3 font-medium">
                Review order summary
              </summary>
              <div className="border-t p-3">
                <CheckoutSummary cart={liveCart ?? cart} />
              </div>
            </details>
            {clientSecret ? (
              <StripeWrapper clientSecret={clientSecret}>
                <PaymentStep
                  onBack={goBack}
                  onComplete={handlePaymentComplete}
                  total={(liveCart ?? cart).total ?? 0}
                  currencyCode={(liveCart ?? cart).region?.currency_code ?? "aud"}
                />
              </StripeWrapper>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-2">
                  <h2 className="text-xl font-bold">Payment</h2>
                  <p className="text-sm text-destructive">
                    Payment setup is not ready. Please go back and choose a delivery method again.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={goBack}>
                  Back
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
