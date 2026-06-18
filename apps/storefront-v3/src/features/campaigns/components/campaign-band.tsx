import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BadgePercent } from "lucide-react"

import { Button } from "@/components/ui/button"
import { resolveStrapiMediaUrl } from "@/lib/strapi/media"
import { cn } from "@/lib/utils"

import type { CampaignMerchandising } from "../lib/campaign-merchandising"

const themeClassNames: Record<CampaignMerchandising["theme"], string> = {
  default: "border-primary/20 bg-card",
  sale: "border-red-500/30 bg-red-500/5",
  "new-arrival": "border-primary/25 bg-primary/5",
  clearance: "border-amber-500/30 bg-amber-500/5",
}

export function CampaignBand({
  campaign,
  compact = false,
}: {
  campaign: CampaignMerchandising
  compact?: boolean
}) {
  const imageSrc = resolveStrapiMediaUrl(campaign.image?.url)

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border",
        themeClassNames[campaign.theme]
      )}
      data-campaign-identifier={campaign.campaignIdentifier}
    >
      <div
        className={cn(
          "grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center md:p-6",
          compact && "md:grid-cols-[minmax(0,1fr)_180px]"
        )}
      >
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {campaign.eyebrow ? (
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {campaign.eyebrow}
              </p>
            ) : null}
            {campaign.badgeText ? (
              <span className="inline-flex items-center gap-1 rounded-sm bg-primary px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-primary-foreground">
                <BadgePercent className="h-3 w-3" />
                {campaign.badgeText}
              </span>
            ) : null}
          </div>
          <h2
            className={cn(
              "font-bold tracking-tight",
              compact ? "text-2xl" : "text-2xl md:text-3xl"
            )}
          >
            {campaign.headline}
          </h2>
          {campaign.text ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              {campaign.text}
            </p>
          ) : null}
          <div className="mt-5">
            <Button asChild className="rounded-sm font-mono text-sm">
              <Link href={campaign.ctaHref}>
                {campaign.ctaText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {imageSrc && campaign.image ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-md border bg-background">
            <Image
              src={imageSrc}
              alt={campaign.image.alternativeText || campaign.headline}
              fill
              className="object-cover"
              sizes={compact ? "180px" : "220px"}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
