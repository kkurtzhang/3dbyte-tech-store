"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Truck, Zap, Package } from "lucide-react"
import { cn } from "@/lib/utils"

interface DeliveryOption {
  id: string
  title: string
  description: string
  price: number
  icon: React.ElementType
}

const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: "standard",
    title: "Standard Ground",
    description: "3-5 business days. Reliable transport.",
    price: 0,
    icon: Truck,
  },
  {
    id: "express",
    title: "Express Air",
    description: "1-2 business days. Priority handling.",
    price: 1500, // $15.00
    icon: Zap,
  },
  {
    id: "freight",
    title: "Heavy Freight",
    description: "5-7 business days. For bulk equipment.",
    price: 5000, // $50.00
    icon: Package,
  },
]

interface DeliveryStepProps {
  onBack: () => void
  onComplete: (methodId: string) => Promise<void> | void
}

export function DeliveryStep({ onBack, onComplete }: DeliveryStepProps) {
  const [selectedId, setSelectedId] = useState<string>("standard")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onComplete(selectedId)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <h2 className="text-xl font-bold">Logistics Method</h2>
        <p className="text-sm text-muted-foreground">
          Select transport priority level.
        </p>
      </div>

      <RadioGroup
        value={selectedId}
        onValueChange={setSelectedId}
        className="grid gap-4"
      >
        {DELIVERY_OPTIONS.map((option) => (
          <div key={option.id}>
            <RadioGroupItem
              value={option.id}
              id={option.id}
              className="peer sr-only"
            />
            <Label
              htmlFor={option.id}
              className={cn(
                "flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-all",
                "hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-primary"
              )}
            >
              <option.icon className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono font-bold text-sm uppercase">
                    {option.title}
                  </h3>
                  <span className="font-mono text-sm">
                    {option.price === 0
                      ? "INCLUDED"
                      : `$${(option.price / 100).toFixed(2)}`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {option.description}
                </p>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          type="submit"
          className="flex-1 font-mono uppercase tracking-widest"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Calculating_Route..." : "Confirm_Method"}
        </Button>
      </div>
    </form>
  )
}
