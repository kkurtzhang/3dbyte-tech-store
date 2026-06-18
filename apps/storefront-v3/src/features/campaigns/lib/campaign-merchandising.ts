import type { StoreCampaign } from "@/lib/medusa/campaigns"
import type { CampaignPlacementData } from "@/lib/strapi/types"

export type CampaignMerchandising = {
  id: string
  campaignIdentifier: string
  eyebrow?: string
  headline: string
  text?: string
  badgeText?: string
  ctaText: string
  ctaHref: string
  image?: CampaignPlacementData["Image"]
  theme: NonNullable<CampaignPlacementData["Theme"]>
  promotionCodes: string[]
}

function normalizeIdentifier(value?: string | null) {
  return value?.trim().toLowerCase() || ""
}

function textOrUndefined(value?: string | null) {
  const trimmed = value?.trim()

  return trimmed || undefined
}

function safeHref(value?: string | null) {
  const trimmed = value?.trim()

  if (!trimmed || !trimmed.startsWith("/")) {
    return "/deals"
  }

  return trimmed
}

function getPromotionCodes(campaign: StoreCampaign) {
  return (
    campaign.promotions
      ?.map((promotion) => promotion.code?.trim())
      .filter((code): code is string => Boolean(code)) ?? []
  )
}

export function resolveCampaignMerchandising(
  campaigns: StoreCampaign[],
  placements: CampaignPlacementData[]
): CampaignMerchandising | null {
  const activeCampaigns = campaigns.filter((campaign) =>
    normalizeIdentifier(campaign.campaign_identifier)
  )

  if (activeCampaigns.length === 0) {
    return null
  }

  const placementsByIdentifier = new Map<string, CampaignPlacementData>()
  placements
    .filter((placement) => placement.Enabled !== false)
    .sort((left, right) => (right.Priority ?? 0) - (left.Priority ?? 0))
    .forEach((placement) => {
      const identifier = normalizeIdentifier(placement.CampaignIdentifier)

      if (identifier && !placementsByIdentifier.has(identifier)) {
        placementsByIdentifier.set(identifier, placement)
      }
    })

  for (const campaign of activeCampaigns) {
    const identifier = normalizeIdentifier(campaign.campaign_identifier)
    const placement = placementsByIdentifier.get(identifier)
    const promotionCodes = getPromotionCodes(campaign)

    if (placement) {
      return {
        id: campaign.id,
        campaignIdentifier: campaign.campaign_identifier,
        eyebrow: textOrUndefined(placement.Eyebrow),
        headline: placement.Headline,
        text: textOrUndefined(placement.Text) ?? textOrUndefined(campaign.description),
        badgeText:
          textOrUndefined(placement.BadgeText) ?? promotionCodes[0],
        ctaText: textOrUndefined(placement.CTA?.BtnText) ?? "Shop deals",
        ctaHref: safeHref(placement.CTA?.BtnLink),
        image: placement.Image,
        theme: placement.Theme ?? "default",
        promotionCodes,
      }
    }
  }

  const fallbackCampaign = activeCampaigns[0]
  const promotionCodes = getPromotionCodes(fallbackCampaign)

  return {
    id: fallbackCampaign.id,
    campaignIdentifier: fallbackCampaign.campaign_identifier,
    headline: fallbackCampaign.name,
    text: textOrUndefined(fallbackCampaign.description),
    badgeText: promotionCodes[0],
    ctaText: "Shop deals",
    ctaHref: "/deals",
    theme: "default",
    promotionCodes,
  }
}
