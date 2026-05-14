"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useInventoryAlerts } from "@/context/inventory-alert-context"
import { useToast } from "@/lib/hooks/use-toast"
import { Bell, BellOff } from "lucide-react"

interface NotifyMeButtonProps {
  productId: string
  productHandle: string
  productTitle: string
  variantId?: string
  variantTitle?: string
}

export function NotifyMeButton({
  productId,
  productHandle,
  productTitle,
  variantId,
  variantTitle,
}: NotifyMeButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [email, setEmail] = useState("")
  const {
    addAlert,
    customerEmail,
    hasAlert,
    isAuthenticated,
    removeAlertByProduct,
  } = useInventoryAlerts()
  const { toast } = useToast()

  const alreadySubscribed = hasAlert(productId, variantId)

  useEffect(() => {
    if (customerEmail) {
      setEmail(customerEmail)
    }
  }, [customerEmail])

  const normalizedEmail = email.trim()

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

  const handleSubscribe = async () => {
    if (!isValidEmail(normalizedEmail)) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Enter a valid email address for the stock alert.",
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const result = await addAlert({
        email: normalizedEmail,
        productId,
        productHandle,
        productTitle,
        variantId: variantId || "",
        variantTitle: variantTitle || "",
      })

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Subscription Failed",
          description: result.error,
        })
        return
      }
      
      toast({
        title: "Alert Subscribed",
        description: `We'll notify you when ${productTitle}${variantTitle ? ` (${variantTitle})` : ""} is back in stock.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Subscription Failed",
        description: "Something went wrong. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnsubscribe = async () => {
    setIsSubmitting(true)

    try {
      const result = await removeAlertByProduct(productId, variantId)

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Removal Failed",
          description: result.error,
        })
        return
      }

      toast({
        title: "Alert Removed",
        description: "You will no longer receive notifications for this item.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {alreadySubscribed ? (
        <Button
          variant="outline"
          size="lg"
          className="w-full font-mono text-lg h-14 uppercase tracking-widest border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
          onClick={handleUnsubscribe}
          disabled={isSubmitting}
        >
          <BellOff className="mr-2 h-5 w-5" />
          Already Notified
        </Button>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor={`waitlist-email-${productId}`}>Email address</Label>
            <Input
              id={`waitlist-email-${productId}`}
              type="email"
              autoComplete="email"
              placeholder={isAuthenticated ? undefined : "you@example.com"}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="lg"
            className="w-full font-mono text-lg h-14 uppercase tracking-widest"
            onClick={handleSubscribe}
            disabled={isSubmitting}
          >
            <Bell className="mr-2 h-5 w-5" />
            {isSubmitting ? "Subscribing..." : "Notify Me"}
          </Button>
        </>
      )}
    </div>
  )
}
