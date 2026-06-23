import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BadgePercent, CalendarClock, Tag } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { resolveStrapiMediaUrl } from "@/lib/strapi/media"
import { cn } from "@/lib/utils"

import type { CampaignMerchandising } from "../lib/campaign-merchandising"
import { PromotionCodeButton } from "./promotion-code-button"

const themeClassNames: Record<CampaignMerchandising["theme"], string> = {
  default: "border-primary/20 bg-card",
  sale: "border-red-500/30 bg-red-500/5",
  "new-arrival": "border-primary/25 bg-primary/5",
  clearance: "border-amber-500/30 bg-amber-500/5",
}

function formatCampaignEndDate(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const formatted = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date)

  return `Ends ${formatted}`
}

export function CampaignPromotionCard({
  campaign,
  wide = false,
}: {
  campaign: CampaignMerchandising
  wide?: boolean
}) {
  const imageSrc = resolveStrapiMediaUrl(campaign.image?.url)
  const endLabel = formatCampaignEndDate(campaign.endsAt)
  const badgeText =
    campaign.badgeText && campaign.badgeText !== campaign.primaryPromotionCode
      ? campaign.badgeText
      : null

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border",
        themeClassNames[campaign.theme]
      )}
      data-campaign-identifier={campaign.campaignIdentifier}
    >
      <div
        className={cn(
          "grid gap-5 p-5",
          imageSrc && "md:grid-cols-[minmax(0,1fr)_180px] md:items-stretch",
          imageSrc && wide && "md:grid-cols-[minmax(0,1fr)_220px]"
        )}
      >
        <div className="flex min-w-0 flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {campaign.eyebrow ? (
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {campaign.eyebrow}
              </p>
            ) : null}
            <Badge className="rounded-sm font-mono text-[11px] uppercase tracking-wider" variant="secondary">
              {campaign.hasPromotionCode ? (
                <BadgePercent className="mr-1 h-3 w-3" />
              ) : (
                <Tag className="mr-1 h-3 w-3" />
              )}
              {campaign.hasPromotionCode ? "Promo code" : "Campaign offer"}
            </Badge>
            {badgeText ? (
              <Badge className="rounded-sm font-mono text-[11px] uppercase tracking-wider">
                {badgeText}
              </Badge>
            ) : null}
            {endLabel ? (
              <span className="inline-flex items-center gap-1 rounded-sm border bg-background px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <CalendarClock className="h-3 w-3" />
                {endLabel}
              </span>
            ) : null}
          </div>

          <h3 className="text-xl font-bold tracking-tight md:text-2xl">
            {campaign.headline}
          </h3>

          {campaign.text ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {campaign.text}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {campaign.primaryPromotionCode ? (
              <PromotionCodeButton code={campaign.primaryPromotionCode} />
            ) : null}
            <Button asChild className="rounded-sm font-mono text-sm" size="sm">
              <Link href={campaign.ctaHref}>
                {campaign.ctaText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            {campaign.hasPromotionCode
              ? "Use promo codes in cart or checkout. Product cards only show sale prices from active price lists."
              : "Campaign terms are shown here; product markdowns appear directly on product cards."}
          </p>
        </div>

        {imageSrc && campaign.image ? (
          <div className="relative min-h-[160px] overflow-hidden rounded-md border bg-background">
            <Image
              alt={campaign.image.alternativeText || campaign.headline}
              className="object-cover"
              fill
              sizes={wide ? "220px" : "180px"}
              src={imageSrc}
            />
          </div>
        ) : null}
      </div>
    </article>
  )
}
