import Link from "next/link"
import {
  BadgePercent,
  Bell,
  Clock3,
  Gift,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { AnnouncementBarIcon } from "@/lib/strapi/types"

export interface AnnouncementBarItem {
  id: number
  Text: string
  Link?: string | null
  Icon?: AnnouncementBarIcon | null
}

const announcementIcons: Record<AnnouncementBarIcon, LucideIcon> = {
  "badge-percent": BadgePercent,
  bell: Bell,
  clock: Clock3,
  gift: Gift,
  package: Package,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  truck: Truck,
}

function AnnouncementBarEntry({ item }: { item: AnnouncementBarItem }) {
  const Icon = item.Icon ? announcementIcons[item.Icon] : null
  const content = (
    <span className="flex items-center gap-2 whitespace-nowrap text-xs font-medium uppercase tracking-[0.18em]">
      {Icon ? (
        <Icon
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0"
          data-testid={`announcement-icon-${item.Icon}`}
        />
      ) : null}
      <span>{item.Text}</span>
    </span>
  )

  if (item.Link) {
    return (
      <Link
        aria-label={item.Text}
        className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70"
        href={item.Link}
      >
        {content}
      </Link>
    )
  }

  return content
}

export function AnnouncementBar({ items }: { items: AnnouncementBarItem[] }) {
  const visibleItems = items.filter((item) => item.Text.trim().length > 0)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <div
      aria-label="Store announcements"
      className="border-b border-border/50 bg-primary text-primary-foreground"
      role="region"
    >
      <div className="relative flex overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-primary to-transparent" />
        <div
          className={cn(
            "flex min-w-max shrink-0 items-center gap-8 px-4 py-2",
            "animate-[announcement-marquee_28s_linear_infinite]",
            "motion-reduce:animate-none"
          )}
        >
          {visibleItems.map((item) => (
            <div key={item.id} className="flex items-center gap-8">
              <AnnouncementBarEntry item={item} />
              <span
                aria-hidden="true"
                className="h-1 w-1 rounded-full bg-primary-foreground/60"
              />
            </div>
          ))}
          <div aria-hidden="true" className="flex items-center gap-8">
            {visibleItems.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex items-center gap-8"
              >
                <AnnouncementBarEntry item={item} />
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-primary-foreground/60"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-primary to-transparent" />
      </div>
    </div>
  )
}
