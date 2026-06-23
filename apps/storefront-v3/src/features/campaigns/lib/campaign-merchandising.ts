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
  primaryPromotionCode?: string
  hasPromotionCode: boolean
  startsAt?: string | null
  endsAt?: string | null
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

function buildCampaignMerchandising(
  campaign: StoreCampaign,
  placement?: CampaignPlacementData
): CampaignMerchandising {
  const promotionCodes = getPromotionCodes(campaign)
  const primaryPromotionCode = promotionCodes[0]

  if (placement) {
    return {
      id: campaign.id,
      campaignIdentifier: campaign.campaign_identifier,
      eyebrow: textOrUndefined(placement.Eyebrow),
      headline: textOrUndefined(placement.Headline) ?? campaign.name,
      text: textOrUndefined(placement.Text) ?? textOrUndefined(campaign.description),
      badgeText:
        textOrUndefined(placement.BadgeText) ?? primaryPromotionCode,
      ctaText: textOrUndefined(placement.CTA?.BtnText) ?? "Shop deals",
      ctaHref: safeHref(placement.CTA?.BtnLink),
      image: placement.Image,
      theme: placement.Theme ?? "default",
      promotionCodes,
      primaryPromotionCode,
      hasPromotionCode: promotionCodes.length > 0,
      startsAt: campaign.starts_at ?? null,
      endsAt: campaign.ends_at ?? null,
    }
  }

  return {
    id: campaign.id,
    campaignIdentifier: campaign.campaign_identifier,
    headline: campaign.name,
    text: textOrUndefined(campaign.description),
    badgeText: primaryPromotionCode,
    ctaText: "Shop deals",
    ctaHref: "/deals",
    theme: "default",
    promotionCodes,
    primaryPromotionCode,
    hasPromotionCode: promotionCodes.length > 0,
    startsAt: campaign.starts_at ?? null,
    endsAt: campaign.ends_at ?? null,
  }
}

export function resolveCampaignMerchandisingList(
  campaigns: StoreCampaign[],
  placements: CampaignPlacementData[]
): CampaignMerchandising[] {
  const activeCampaigns = campaigns.filter((campaign) =>
    normalizeIdentifier(campaign.campaign_identifier)
  )

  if (activeCampaigns.length === 0) {
    return []
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

  const campaignsByIdentifier = new Map<string, StoreCampaign>()
  for (const campaign of activeCampaigns) {
    const identifier = normalizeIdentifier(campaign.campaign_identifier)

    if (!campaignsByIdentifier.has(identifier)) {
      campaignsByIdentifier.set(identifier, campaign)
    }
  }

  const matchedIdentifiers = new Set<string>()
  const placedCampaigns = Array.from(placementsByIdentifier.entries())
    .map(([identifier, placement]) => {
      const campaign = campaignsByIdentifier.get(identifier)

      if (!campaign) {
        return null
      }

      matchedIdentifiers.add(identifier)

      return buildCampaignMerchandising(campaign, placement)
    })
    .filter((campaign): campaign is CampaignMerchandising => Boolean(campaign))

  const fallbackCampaigns = activeCampaigns
    .filter(
      (campaign) =>
        !matchedIdentifiers.has(normalizeIdentifier(campaign.campaign_identifier))
    )
    .map((campaign) => buildCampaignMerchandising(campaign))

  return [...placedCampaigns, ...fallbackCampaigns]
}

export function resolveCampaignMerchandising(
  campaigns: StoreCampaign[],
  placements: CampaignPlacementData[]
): CampaignMerchandising | null {
  return resolveCampaignMerchandisingList(campaigns, placements)[0] ?? null
}
