"use client"

import { useState } from "react"
import { StoreCart } from "@medusajs/types"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { AddressStep } from "./address-step"
import { DeliveryStep } from "./delivery-step"
import { PaymentStep } from "./payment-step"

import { setAddressesAction, setShippingMethodAction, completeCartAction, initPaymentSessionAction } from "@/app/actions/checkout"
import { useRouter } from "next/navigation"
import { StripeWrapper } from "./stripe-wrapper"

interface CheckoutFormProps {
  cart: StoreCart
}

type Step = "address" | "delivery" | "payment"

export function CheckoutForm({ cart }: CheckoutFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("address")

  // Form Data State
  const [addressData, setAddressData] = useState<any>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<string>("standard")
  const [clientSecret, setClientSecret] = useState<string | undefined>(undefined)

  const steps = [
    { id: "address", label: "Phase 1: Identification" },
    { id: "delivery", label: "Phase 2: Logistics" },
    { id: "payment", label: "Phase 3: Transaction" },
  ]

  const handleAddressComplete = async (data: any) => {
    const result = await setAddressesAction(data)
    if (result.success) {
      setAddressData(data)
      setCurrentStep("delivery")
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      console.error(result.error)
      // TODO: Show toast error
      alert("Failed to save address: " + result.error)
    }
  }

  const handleDeliveryComplete = async (methodId: string) => {
    const result = await setShippingMethodAction(methodId)
    if (result.success) {
      setDeliveryMethod(methodId)

      // Initialize payment session
      const sessionResult = await initPaymentSessionAction()
      if (sessionResult.success) {
        // Find Stripe session data
        const paymentSession = sessionResult.paymentCollection?.payment_sessions?.find(
          (s: any) => s.provider_id === "pp_stripe_stripe"
        )

        if (paymentSession?.data?.client_secret) {
            setClientSecret(paymentSession.data.client_secret)
        }

        setCurrentStep("payment")
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
         console.error(sessionResult.error)
         alert("Failed to initialize payment: " + sessionResult.error)
      }
    } else {
      console.error(result.error)
      alert("Failed to set shipping method: " + result.error)
    }
  }

  const handlePaymentComplete = async () => {
    const result = await completeCartAction()
    if (result.success) {
      console.log("Order placed:", result.order, "Delivery Method:", deliveryMethod)
      // Redirect to confirmation page
      // router.push(`/order/confirmed/${result.order.id}`)
      alert("Order placed successfully! Redirecting...")
      // For now, just reset or redirect home/cart
      router.refresh()
    } else {
      console.error(result.error)
      alert("Failed to complete order: " + result.error)
    }
  }

  return (
    <div className="space-y-8">
      {/* Progress Indicators */}
      <div className="flex items-center gap-4 text-sm overflow-x-auto pb-2 scrollbar-hide">
         {steps.map((step, index) => {
            const isActive = step.id === currentStep
            const isCompleted = steps.findIndex(s => s.id === currentStep) > index

            return (
                <div key={step.id} className={cn("flex items-center gap-2 min-w-max",
                    isActive ? "text-primary font-bold" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/50"
                )}>
                    {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                    ) : (
                        <Circle className={cn("h-4 w-4", isActive && "fill-current animate-pulse")} />
                    )}
                    <span className="font-mono uppercase tracking-wider hidden md:inline-block">{step.label}</span>
                    <span className="font-mono uppercase tracking-wider md:hidden">{step.label.split(": ")[1]}</span>
                    {index < steps.length - 1 && (
                        <Separator orientation="vertical" className="h-4 mx-2" />
                    )}
                </div>
            )
         })}
      </div>

      {/* Step Content */}
      <div className="rounded-lg border bg-card p-6 md:p-8 shadow-sm">
         {currentStep === "address" && (
            <AddressStep
              onComplete={handleAddressComplete}
              defaultValues={addressData || { email: cart.email }}
            />
         )}

         {currentStep === "delivery" && (
            <DeliveryStep
              onBack={() => setCurrentStep("address")}
              onComplete={handleDeliveryComplete}
            />
         )}

         {currentStep === "payment" && (
            <StripeWrapper clientSecret={clientSecret}>
                <PaymentStep
                  onBack={() => setCurrentStep("delivery")}
                  onComplete={handlePaymentComplete}
                />
            </StripeWrapper>
         )}
      </div>
    </div>
  )
}
