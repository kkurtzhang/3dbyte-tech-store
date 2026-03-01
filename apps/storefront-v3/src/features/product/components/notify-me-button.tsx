"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useInventoryAlerts } from "@/context/inventory-alert-context"
import { useToast } from "@/lib/hooks/use-toast"
import { Bell, BellOff, Mail } from "lucide-react"

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
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addAlert, hasAlert, removeAlertByProduct } = useInventoryAlerts()
  const { toast } = useToast()

  const alreadySubscribed = hasAlert(productId, variantId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes("@")) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      // Simulate a brief network delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      addAlert({
        productId,
        productHandle,
        productTitle,
        variantId: variantId || "",
        variantTitle: variantTitle || "",
        email,
      })
      
      toast({
        title: "Alert Subscribed",
        description: `We'll notify you when ${productTitle}${variantTitle ? ` (${variantTitle})` : ""} is back in stock.`,
      })
      
      setEmail("")
      setIsOpen(false)
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

  const handleUnsubscribe = () => {
    removeAlertByProduct(productId, variantId)
    toast({
      title: "Alert Removed",
      description: "You will no longer receive notifications for this item.",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {alreadySubscribed ? (
          <Button
            variant="outline"
            size="lg"
            className="w-full font-mono text-lg h-14 uppercase tracking-widest border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
          >
            <BellOff className="mr-2 h-5 w-5" />
            Already Notified
          </Button>
        ) : (
          <Button
            variant="outline"
            size="lg"
            className="w-full font-mono text-lg h-14 uppercase tracking-widest"
          >
            <Bell className="mr-2 h-5 w-5" />
            Notify Me
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Get Notified When Available
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enter your email to be notified when{" "}
              <span className="font-medium text-foreground">
                {productTitle}
                {variantTitle && ` (${variantTitle})`}
              </span>{" "}
              is back in stock.
            </p>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Subscribing..." : "Subscribe"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
