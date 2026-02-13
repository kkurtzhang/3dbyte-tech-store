"use client"

import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type CheckoutStepId = "shipping" | "delivery" | "payment" | "review" | "confirmation"

export interface CheckoutStep {
  id: CheckoutStepId
  label: string
  shortLabel?: string
}

export const CHECKOUT_STEPS: CheckoutStep[] = [
  { id: "shipping", label: "Shipping", shortLabel: "Ship" },
  { id: "delivery", label: "Delivery", shortLabel: "Delivery" },
  { id: "payment", label: "Payment", shortLabel: "Pay" },
  { id: "review", label: "Review", shortLabel: "Review" },
  { id: "confirmation", label: "Confirmation", shortLabel: "Done" },
]

interface CheckoutStepperProps {
  currentStep: CheckoutStepId
  onStepClick?: (step: CheckoutStepId) => void
  completedSteps?: CheckoutStepId[]
  showNavigation?: boolean
  onBack?: () => void
  onNext?: () => void
}

export function CheckoutStepper({
  currentStep,
  onStepClick,
  completedSteps = [],
  showNavigation = false,
  onBack,
  onNext,
}: CheckoutStepperProps) {
  const currentIndex = CHECKOUT_STEPS.findIndex((s) => s.id === currentStep)

  const canNavigate = (stepId: CheckoutStepId) => {
    const stepIndex = CHECKOUT_STEPS.findIndex((s) => s.id === stepId)
    // Can navigate to current step or any completed step
    return stepIndex <= currentIndex || completedSteps.includes(stepId)
  }

  return (
    <div className="w-full">
      {/* Stepper for desktop */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Progress line background */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-border" />

          {/* Active progress line */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary transition-all duration-500 ease-in-out"
            style={{
              width: `${(currentIndex / (CHECKOUT_STEPS.length - 1)) * 100}%`,
            }}
          />

          {/* Steps */}
          <div className="relative flex justify-between">
            {CHECKOUT_STEPS.map((step, index) => {
              const isCompleted = index < currentIndex || completedSteps.includes(step.id)
              const isActive = step.id === currentStep
              const isClickable = canNavigate(step.id)

              return (
                <div key={step.id} className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => isClickable && onStepClick?.(step.id)}
                    disabled={!isClickable}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isCompleted && "border-primary bg-primary text-primary-foreground",
                      isActive && "border-primary bg-background text-primary ring-4 ring-primary/20",
                      !isCompleted && !isActive && "border-muted-foreground/30 bg-background text-muted-foreground/50",
                      isClickable && !isActive && "cursor-pointer hover:border-primary/70 hover:scale-110",
                      !isClickable && "cursor-not-allowed"
                    )}
                    aria-label={step.label}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-bold">{index + 1}</span>
                    )}
                  </button>
                  <span
                    className={cn(
                      "mt-2 text-xs font-medium transition-colors duration-300",
                      isActive && "text-primary font-bold",
                      isCompleted && "text-foreground",
                      !isCompleted && !isActive && "text-muted-foreground/50"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile stepper - horizontal scroll */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CHECKOUT_STEPS.map((step, index) => {
            const isCompleted = index < currentIndex || completedSteps.includes(step.id)
            const isActive = step.id === currentStep
            const isClickable = canNavigate(step.id)

            return (
              <div key={step.id} className="flex items-center min-w-max">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                    isClickable && "cursor-pointer"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                      isCompleted && "border-primary bg-primary text-primary-foreground",
                      isActive && "border-primary bg-background text-primary ring-2 ring-primary/20",
                      !isCompleted && !isActive && "border-muted-foreground/30 bg-background text-muted-foreground/50"
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium whitespace-nowrap",
                      isActive && "text-primary font-bold",
                      isCompleted && "text-foreground",
                      !isCompleted && !isActive && "text-muted-foreground/50"
                    )}
                  >
                    {step.shortLabel || step.label}
                  </span>
                </button>

                {/* Arrow connector for mobile */}
                {index < CHECKOUT_STEPS.length - 1 && (
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 mx-1 flex-shrink-0",
                      index < currentIndex ? "text-primary" : "text-muted-foreground/30"
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Navigation buttons */}
      {showNavigation && (
        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={currentIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          {onNext && currentIndex < CHECKOUT_STEPS.length - 1 && (
            <Button type="button" onClick={onNext} className="gap-2">
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
