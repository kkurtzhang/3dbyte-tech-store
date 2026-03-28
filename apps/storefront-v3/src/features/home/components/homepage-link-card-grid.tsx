import Link from "next/link"
import {
  BookOpen,
  Package,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Wrench,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react"

import type { HomepageLinkCardIcon } from "@/lib/strapi/types"
import type { HomepageLinkCardView } from "../lib/homepage-content"

const iconMap: Record<HomepageLinkCardIcon, LucideIcon> = {
  "book-open": BookOpen,
  package: Package,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  store: Store,
  truck: Truck,
  wrench: Wrench,
}

interface HomepageLinkCardGridProps {
  items: HomepageLinkCardView[]
}

export function HomepageLinkCardGrid({ items }: HomepageLinkCardGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = iconMap[item.icon]

        return (
          <Link
            key={item.id}
            className="group flex h-full flex-col justify-between rounded-[1.5rem] border border-border/70 bg-card px-5 py-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/95"
            href={item.link}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>

              <div className="space-y-2">
                {item.eyebrow ? (
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {item.eyebrow}
                  </p>
                ) : null}
                <h3 className="text-lg font-semibold leading-tight text-foreground">
                  {item.title}
                </h3>
                {item.text ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item.text}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-primary">
              {item.linkText}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
