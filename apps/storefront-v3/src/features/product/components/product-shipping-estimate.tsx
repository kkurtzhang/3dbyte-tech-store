"use client"

import { Clock3, PackageCheck, Truck } from "lucide-react"

const shippingEstimateItems = [
  {
    title: "Dispatch estimate",
    description: "Orders usually leave our warehouse in 1-2 business days.",
    Icon: Clock3,
  },
  {
    title: "Tracked delivery",
    description: "Metro AU addresses typically arrive 2-6 business days after dispatch.",
    Icon: Truck,
  },
  {
    title: "Packed with care",
    description: "Secure packaging and post-purchase support for technical parts and upgrades.",
    Icon: PackageCheck,
  },
]

export function ProductShippingEstimate() {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="mb-3">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          Shipping Estimate
        </p>
      </div>

      <div className="grid gap-3">
        {shippingEstimateItems.map(({ title, description, Icon }) => (
          <div key={title} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/80 p-3">
            <div className="mt-0.5 rounded-md bg-secondary/50 p-2 text-foreground">
              <Icon className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
