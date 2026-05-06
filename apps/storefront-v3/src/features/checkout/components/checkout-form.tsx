"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { useCart } from "@/context/cart-context"
import type { MedusaCart } from "@/lib/medusa/cart"
import type {
  MedusaCurrencyAmount,
  MedusaProductVariantWithPreorder,
} from "@/lib/medusa/types"
import { useCheckoutSummaryEstimate } from "./checkout-summary-estimate-context"

interface CheckoutFormProps {
  cart: MedusaCart
}

// Checkout flow: shipping → delivery → payment → confirmation
type CheckoutFlowStep = "shipping" | "delivery" | "payment" | "review"

export function CheckoutForm({ cart }: CheckoutFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { clearCart, refreshCart } = useCart()
  const checkoutSummaryEstimate = useCheckoutSummaryEstimate()
  const [currentStep, setCurrentStep] = useState<CheckoutFlowStep>("shipping")

  // Track completed steps for navigation
  const [completedSteps, setCompletedSteps] = useState<CheckoutStepId[]>([])

  // Form Data State
  const [addressData, setAddressData] = useState<any>(null)
  const [shippingMethodData, setShippingMethodData] = useState<{ name: string; price: number } | null>(null)
  const [clientSecret, setClientSecret] = useState<string | undefined>(undefined)
  
  // Loading states
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false)
  const [isLoadingOrder, setIsLoadingOrder] = useState(false)

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
    } finally {
      setIsLoadingAddress(false)
    }
  }

  const handleDeliveryComplete = async (
    methodId: string,
    data?: Record<string, unknown>,
    summary?: { name: string; price: number }
  ) => {
    setIsLoadingDelivery(true)
    try {
      const result = await setShippingMethodAction(methodId, data)
      if (result.success) {
        if (summary) {
          setShippingMethodData(summary)
        } else {
          // Get shipping method details
          const optionsResult = await getShippingOptionsAction()
          const shippingOption = optionsResult.options?.find((opt: any) => opt.id === methodId)
          if (optionsResult.success) {
            setShippingMethodData({
              name: shippingOption?.name || "Shipping",
              price:
                typeof shippingOption?.amount === "number"
                  ? shippingOption.amount
                  : 0,
            })
          }
        }
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
    } finally {
      setIsLoadingDelivery(false)
    }
  }

  const handlePaymentComplete = async () => {
    setCompletedSteps((prev) => [...prev, "payment"])
    await handlePlaceOrder()
  }

  const handlePlaceOrder = async () => {
    setIsLoadingOrder(true)
    try {
      const result = await completeCartAction()
      if (result.success && result.order) {
        setCompletedSteps((prev) => [...prev, "review", "confirmation"])
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
    } finally {
      setIsLoadingOrder(false)
    }
  }

  // Build cart data for review step
  const cartDataForReview = {
    items: cart.items?.map((item) => {
      const preorderVariant = item.variant as
        | (MedusaProductVariantWithPreorder & {
            prices?: MedusaCurrencyAmount[] | null
          })
        | undefined

      return {
        id: item.id,
        title: item.product?.title || item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        total: item.total,
        metadata: item.metadata ?? null,
        product: {
          title: item.product?.title,
          thumbnail: item.product?.thumbnail || item.thumbnail,
        },
        variant: {
          title: item.variant?.title || undefined,
          calculated_price: item.variant?.calculated_price,
          prices: preorderVariant?.prices,
          preorder_variant: preorderVariant?.preorder_variant
            ? {
                status: preorderVariant.preorder_variant.status,
                available_date: preorderVariant.preorder_variant.available_date,
                prices: preorderVariant.preorder_variant.prices,
              }
            : undefined,
        },
      }
    }),
    shippingAddress: addressData,
    email: addressData?.email || cart.email,
    shippingMethod: shippingMethodData,
    currencyCode: cart.region?.currency_code || "usd",
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
            onSelectedEstimateChange={
              checkoutSummaryEstimate?.setEstimatedShippingTotal
            }
          />
        )}

        {currentStep === "payment" && (
          clientSecret ? (
            <StripeWrapper clientSecret={clientSecret}>
              <PaymentStep
                onBack={goBack}
                onComplete={handlePaymentComplete}
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
          )
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
