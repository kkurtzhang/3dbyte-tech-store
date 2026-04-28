"use client"

import {
  SiAmericanexpress,
  SiApplepay,
  SiGooglepay,
  SiMastercard,
  SiStripe,
  SiVisa,
} from "@icons-pack/react-simple-icons"
import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaymentMethodSupportProps {
  label?: string
  compact?: boolean
  className?: string
}

const paymentMethods = [
  { label: "Stripe", Icon: SiStripe },
  { label: "Visa", Icon: SiVisa },
  { label: "Mastercard", Icon: SiMastercard },
  { label: "American Express", Icon: SiAmericanexpress },
  { label: "Apple Pay", Icon: SiApplepay },
  { label: "Google Pay", Icon: SiGooglepay },
]

export function PaymentMethodSupport({
  label = "Secure payments",
  compact = false,
  className,
}: PaymentMethodSupportProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-muted/20",
        compact ? "px-3 py-3" : "px-4 py-4",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>{label}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {paymentMethods.map(({ label: methodLabel, Icon }) => (
            <span
              key={methodLabel}
              aria-label={methodLabel}
              title={methodLabel}
              className={cn(
                "inline-flex items-center justify-center rounded-lg border border-border/70 bg-background/80 text-foreground",
                compact ? "h-9 min-w-9 px-2" : "h-10 min-w-10 px-2.5"
              )}
            >
              <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
