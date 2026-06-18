import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

type PromotionSummary = {
  id: string;
  code?: string | null;
  status?: string | null;
};

type CampaignSummary = {
  id: string;
  name: string;
  description?: string | null;
  campaign_identifier?: string | null;
  starts_at?: string | Date | null;
  ends_at?: string | Date | null;
  promotions?: PromotionSummary[] | null;
};

type PromotionModuleService = {
  listCampaigns: (
    filters?: Record<string, unknown>,
    config?: { relations?: string[] },
  ) => Promise<CampaignSummary[] | { campaigns?: CampaignSummary[] }>;
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function isActiveCampaign(campaign: CampaignSummary, now = new Date()) {
  const identifier = campaign.campaign_identifier?.trim();

  if (!identifier) {
    return false;
  }

  const startsAt = toDate(campaign.starts_at);
  const endsAt = toDate(campaign.ends_at);

  if (startsAt && startsAt > now) {
    return false;
  }

  if (endsAt && endsAt <= now) {
    return false;
  }

  return true;
}

function normalizeCampaign(campaign: CampaignSummary) {
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description ?? null,
    campaign_identifier: campaign.campaign_identifier || "",
    starts_at: campaign.starts_at ?? null,
    ends_at: campaign.ends_at ?? null,
    promotions:
      campaign.promotions
        ?.filter((promotion) => !promotion.status || promotion.status === "active")
        .map((promotion) => ({
          id: promotion.id,
          code: promotion.code ?? null,
          status: promotion.status ?? null,
        })) ?? [],
  };
}

export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const promotionModule = req.scope.resolve<PromotionModuleService>(
    Modules.PROMOTION,
  );
  const campaignsResult = await promotionModule.listCampaigns(
    {},
    {
      relations: ["promotions"],
    },
  );
  const campaigns = Array.isArray(campaignsResult)
    ? campaignsResult
    : campaignsResult.campaigns ?? [];

  res.json({
    campaigns: campaigns
      .filter((campaign) => isActiveCampaign(campaign))
      .map(normalizeCampaign),
  });
}
