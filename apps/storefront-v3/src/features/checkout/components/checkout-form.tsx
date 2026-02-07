"use client"

import { useState } from "react"
import { StoreCart } from "@medusajs/types"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AddressStep } from "./address-step"
import { DeliveryStep } from "./delivery-step"
import { PaymentStep } from "./payment-step"

import { setAddressesAction, setShippingMethodAction, completeCartAction, initPaymentSessionAction } from "@/app/actions/checkout"
import { useRouter } from "next/navigation"
import { StripeWrapper } from "./stripe-wrapper"
import { useToast } from "@/lib/hooks/use-toast"

interface CheckoutFormProps {
  cart: StoreCart
}

type Step = "address" | "delivery" | "payment"

export function CheckoutForm({ cart }: CheckoutFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState<Step>("address")

  // Form Data State
  const [addressData, setAddressData] = useState<any>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<string>("standard")
  const [clientSecret, setClientSecret] = useState<string | undefined>(undefined)
  
  // Loading states
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false)
  const [isLoadingPayment, setIsLoadingPayment] = useState(false)

  const steps = [
    { id: "address", label: "Shipping Address" },
    { id: "delivery", label: "Delivery Method" },
    { id: "payment", label: "Payment" },
  ]

  const handleAddressComplete = async (data: any) => {
    setIsLoadingAddress(true)
    try {
      const result = await setAddressesAction(data)
      if (result.success) {
        setAddressData(data)
        setCurrentStep("delivery")
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
    } finally {
      setIsLoadingAddress(false)
    }
  }

  const handleDeliveryComplete = async (methodId: string) => {
    setIsLoadingDelivery(true)
    try {
      const result = await setShippingMethodAction(methodId)
      if (result.success) {
        setDeliveryMethod(methodId)

        // Initialize payment session
        const sessionResult = await initPaymentSessionAction()
        if (sessionResult.success) {
          // Find Stripe session data
          const paymentSession = sessionResult.paymentCollection?.payment_sessions?.find(
            (s: any) => s.provider_id === "stripe" || s.provider_id?.includes("stripe")
          )

          if (paymentSession?.data?.client_secret) {
              setClientSecret(paymentSession.data.client_secret)
          }

          setCurrentStep("payment")
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
    } finally {
      setIsLoadingDelivery(false)
    }
  }

  const handlePaymentComplete = async () => {
    setIsLoadingPayment(true)
    try {
      const result = await completeCartAction()
      if (result.success && result.order) {
        console.log("Order placed:", result.order, "Delivery Method:", deliveryMethod)
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
    } finally {
      setIsLoadingPayment(false)
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
                    <span className="font-mono uppercase tracking-wider md:hidden">{step.label}</span>
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
