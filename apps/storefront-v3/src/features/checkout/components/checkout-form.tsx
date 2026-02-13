"use client"

import { useState } from "react"
import { StoreCart } from "@medusajs/types"
import { AddressStep } from "./address-step"
import { DeliveryStep } from "./delivery-step"
import { PaymentStep } from "./payment-step"
import { ReviewStep } from "./review-step"
import { CheckoutStepper, type CheckoutStepId } from "./checkout-stepper"
import { StripeWrapper } from "./stripe-wrapper"

import { 
  setAddressesAction, 
  setShippingMethodAction, 
  completeCartAction, 
  initPaymentSessionAction,
  getShippingOptionsAction 
} from "@/app/actions/checkout"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"

interface CheckoutFormProps {
  cart: StoreCart
}

// Checkout flow: shipping → delivery → payment → review → confirmation
type CheckoutFlowStep = "shipping" | "delivery" | "payment" | "review"

export function CheckoutForm({ cart }: CheckoutFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState<CheckoutFlowStep>("shipping")

  // Track completed steps for navigation
  const [completedSteps, setCompletedSteps] = useState<CheckoutStepId[]>([])

  // Form Data State
  const [addressData, setAddressData] = useState<any>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<string>("")
  const [shippingMethodData, setShippingMethodData] = useState<{ name: string; price: number } | null>(null)
  const [clientSecret, setClientSecret] = useState<string | undefined>(undefined)
  
  // Loading states
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false)
  const [isLoadingOrder, setIsLoadingOrder] = useState(false)

  // Handle step navigation from stepper - allow going back to completed steps
  const handleStepClick = (stepId: CheckoutStepId) => {
    if (stepId === "confirmation" || stepId === "review") return
    
    const stepOrder: CheckoutStepId[] = ["shipping", "delivery", "payment", "review", "confirmation"]
    const currentIndex = stepOrder.indexOf(currentStep)
    const clickedIndex = stepOrder.indexOf(stepId)
    
    // Only allow navigating backward to completed steps
    if (clickedIndex < currentIndex) {
      setCurrentStep(stepId as CheckoutFlowStep)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleAddressComplete = async (data: any) => {
    setIsLoadingAddress(true)
    try {
      const result = await setAddressesAction(data)
      if (result.success) {
        setAddressData(data)
        setCompletedSteps((prev) => [...prev, "shipping"])
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
        
        // Get shipping method details
        const optionsResult = await getShippingOptionsAction()
        if (optionsResult.success) {
          const shippingOption = optionsResult.options?.find((opt: any) => opt.id === methodId)
          setShippingMethodData({
            name: shippingOption?.name || "Shipping",
            price: shippingOption?.amount || 0,
          })
        }

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

          // Mark delivery step as completed, move to payment
          setCompletedSteps((prev) => [...prev, "delivery"])
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
    // Called after payment is successfully processed in PaymentStep
    // Now move to review step
    setCompletedSteps((prev) => [...prev, "payment"])
    setCurrentStep("review")
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePlaceOrder = async () => {
    setIsLoadingOrder(true)
    try {
      const result = await completeCartAction()
      if (result.success && result.order) {
        console.log("Order placed:", result.order, "Delivery Method:", deliveryMethod)
        setCompletedSteps((prev) => [...prev, "review", "confirmation"])
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
      setIsLoadingOrder(false)
    }
  }

  // Build cart data for review step
  const cartDataForReview = {
    items: cart.items?.map((item) => ({
      id: item.id,
      title: item.product?.title || item.title,
      quantity: item.quantity,
      unit_price: item.unit_price,
      product: {
        title: item.product?.title,
        thumbnail: item.product?.thumbnail || item.thumbnail,
      },
      variant: {
        title: item.variant?.title || undefined,
      },
    })),
    shippingAddress: addressData,
    email: addressData?.email || cart.email,
    shippingMethod: shippingMethodData,
  }

  // Get the current step ID for the stepper
  const getCurrentStepId = (): CheckoutStepId => {
    return currentStep
  }

  // Handle going back from a step
  const goBack = () => {
    const stepOrder: CheckoutFlowStep[] = ["shipping", "delivery", "payment", "review"]
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
          />
        )}

        {currentStep === "payment" && (
          <StripeWrapper clientSecret={clientSecret}>
            <PaymentStep
              onBack={goBack}
              onComplete={handlePaymentComplete}
            />
          </StripeWrapper>
        )}

        {currentStep === "review" && (
          <ReviewStep
            cartData={cartDataForReview as any}
            onBack={goBack}
            onComplete={handlePlaceOrder}
            isProcessing={isLoadingOrder}
          />
        )}
      </div>
    </div>
  )
}
