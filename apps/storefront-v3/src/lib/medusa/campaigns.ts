import { sdk } from "./client"

export type StoreCampaignPromotion = {
  id: string
  code?: string | null
  status?: string | null
}

export type StoreCampaign = {
  id: string
  name: string
  description?: string | null
  campaign_identifier: string
  starts_at?: string | null
  ends_at?: string | null
  promotions?: StoreCampaignPromotion[]
}

type ActiveCampaignsResponse = {
  campaigns?: StoreCampaign[]
}

export async function getActiveCampaigns(): Promise<StoreCampaign[]> {
  try {
    const response = await sdk.client.fetch<ActiveCampaignsResponse>(
      "/store/campaigns/active"
    )

    return response.campaigns ?? []
  } catch (error) {
    console.warn("Failed to fetch active campaigns", error)
    return []
  }
}
