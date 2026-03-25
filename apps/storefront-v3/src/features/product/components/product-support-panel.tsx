import Link from "next/link"
import { ArrowRight, LifeBuoy, RotateCcw, Truck } from "lucide-react"

const supportItems = [
  {
    icon: Truck,
    title: "Dispatch & shipping",
    description: "Delivery windows, shipping options, and restricted-item notes.",
    href: "/shipping",
  },
  {
    icon: RotateCcw,
    title: "Returns policy",
    description: "Straightforward returns if the part is not the right fit.",
    href: "/returns",
  },
  {
    icon: LifeBuoy,
    title: "Need compatibility help?",
    description: "Contact support before ordering if you want a second check.",
    href: "/contact",
  },
]

export function ProductSupportPanel() {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-4 md:p-5">
      <div className="mb-4">
        <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Before You Order
        </p>
        <h3 className="mt-2 text-base font-semibold text-foreground">
          Clear buying signals for a first-launch PDP.
        </h3>
      </div>

      <div className="space-y-3">
        {supportItems.map((item) => {
          const Icon = item.icon

          return (
            <Link
              key={item.title}
              href={item.href}
              className="group flex items-start gap-3 rounded-lg border border-border/60 bg-background px-3 py-3 transition-colors hover:border-foreground/20"
            >
              <div className="rounded-md bg-muted p-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
