"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useInventoryAlerts } from "@/context/inventory-alert-context"
import { useToast } from "@/lib/hooks/use-toast"
import { Bell, BellOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
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
      setIsDialogOpen(false)
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
          className="w-full font-mono text-lg h-14 uppercase tracking-widest border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950 rounded-sm"
          onClick={handleUnsubscribe}
          disabled={isSubmitting}
        >
          <BellOff className="mr-2 h-5 w-5" />
          Already Notified
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            size="lg"
            className="w-full font-mono text-lg h-14 uppercase tracking-widest rounded-sm"
            onClick={() => setIsDialogOpen(true)}
            disabled={isSubmitting}
          >
            <Bell className="mr-2 h-5 w-5" />
            {isSubmitting ? "Subscribing..." : "Notify Me"}
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent 
              className="max-w-md rounded-sm border-border bg-card text-card-foreground shadow-lg backdrop-blur-md sm:rounded-sm"
              onClose={() => setIsDialogOpen(false)}
            >
              <DialogHeader>
                <DialogTitle className="font-mono text-lg uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                  Stock Alert Subscription
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  We will notify you when <span className="font-semibold text-foreground">{productTitle}</span>{variantTitle ? ` (${variantTitle})` : ""} is back in stock.
                </DialogDescription>
              </DialogHeader>

              <form 
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubscribe()
                }}
                className="space-y-4 mt-2"
              >
                <div className="space-y-2">
                  <Label htmlFor={`waitlist-email-${productId}`} className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Email address
                  </Label>
                  <Input
                    id={`waitlist-email-${productId}`}
                    type="email"
                    autoComplete="email"
                    placeholder={isAuthenticated ? undefined : "you@example.com"}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="rounded-sm focus-visible:ring-cyan-500 focus-visible:border-cyan-500/50"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-sm font-mono uppercase tracking-wider"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 rounded-sm font-mono uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Subscribing..." : "Notify Me"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
