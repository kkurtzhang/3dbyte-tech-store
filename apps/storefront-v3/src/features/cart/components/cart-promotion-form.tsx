"use client"

import { FormEvent, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCart } from "@/context/cart-context"
import { cn } from "@/lib/utils"

type PromotionLike = {
  code?: string | null
}

function getPromotionCodes(promotions: PromotionLike[] | null | undefined) {
  return (
    promotions
      ?.map((promotion) => promotion.code?.trim())
      .filter((code): code is string => Boolean(code)) ?? []
  )
}

export function CartPromotionForm({
  promotions,
}: {
  promotions?: PromotionLike[] | null
}) {
  const [promoCode, setPromoCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { applyPromotion, removePromotion } = useCart()
  const promotionCodes = getPromotionCodes(promotions)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedCode = promoCode.trim()

    if (!trimmedCode) {
      setError("Enter a promotion code")
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await applyPromotion(trimmedCode)
      setPromoCode("")
    } catch {
      setError("Promotion code could not be applied")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (code: string) => {
    setError(null)
    setIsSubmitting(true)
    try {
      await removePromotion(code)
    } catch {
      setError("Promotion code could not be removed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <form className="space-y-2" onSubmit={handleSubmit}>
        <Label htmlFor="cart-promotion-code" className="text-xs font-medium">
          Promotion code
        </Label>
        <div className="flex gap-2">
          <Input
            id="cart-promotion-code"
            autoComplete="off"
            value={promoCode}
            onChange={(event) => setPromoCode(event.target.value)}
            placeholder="Enter code"
            className="h-9"
          />
          <Button
            type="submit"
            size="sm"
            className="h-9 rounded-sm"
            disabled={isSubmitting}
          >
            Apply
          </Button>
        </div>
      </form>

      {promotionCodes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {promotionCodes.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-2 rounded-sm border bg-background px-2 py-1 font-mono text-xs"
            >
              {code}
              <button
                type="button"
                aria-label={`Remove ${code}`}
                className={cn(
                  "rounded-sm text-muted-foreground transition-colors hover:text-foreground",
                  isSubmitting && "pointer-events-none opacity-50"
                )}
                disabled={isSubmitting}
                onClick={() => void handleRemove(code)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
