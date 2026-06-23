"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function PromotionCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button
      aria-label={`Copy promo code ${code}`}
      className={cn(
        "h-9 max-w-full gap-2 rounded-sm border-border bg-background px-3 font-mono text-xs uppercase tracking-wider",
        copied && "border-primary/40 bg-primary/10 text-primary"
      )}
      onClick={handleCopy}
      size="sm"
      type="button"
      variant="outline"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="truncate">{copied ? "Copied" : code}</span>
    </Button>
  )
}
