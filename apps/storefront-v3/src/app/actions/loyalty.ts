"use server"

import { sdk } from "@/lib/medusa/client"

export interface LoyaltyPoints {
  points: number
  tier: string
  tierProgress: number
  nextTierPoints: number
  lifetimePoints: number
}

export interface PointsTransaction {
  id: string
  type: "earned" | "redeemed"
  points: number
  description: string
  date: string
  orderId?: string
}

export interface RewardTier {
  id: string
  name: string
  minPoints: number
  discount: string
  perks: string[]
}

const REWARD_TIERS: RewardTier[] = [
  {
    id: "bronze",
    name: "Bronze",
    minPoints: 0,
    discount: "5%",
    perks: ["5% off all orders", "Birthday rewards", "Early access to sales"],
  },
  {
    id: "silver",
    name: "Silver",
    minPoints: 500,
    discount: "10%",
    perks: ["10% off all orders", "Free shipping", "Birthday rewards", "Early access to sales"],
  },
  {
    id: "gold",
    name: "Gold",
    minPoints: 1500,
    discount: "15%",
    perks: ["15% off all orders", "Free express shipping", "Birthday rewards", "Early access to sales", "Exclusive member events"],
  },
  {
    id: "platinum",
    name: "Platinum",
    minPoints: 5000,
    discount: "20%",
    perks: ["20% off all orders", "Free express shipping", "Priority customer support", "Birthday rewards", "Early access to sales", "Exclusive member events", "Personal shopping assistant"],
  },
]

export async function getLoyaltyDataAction(): Promise<{
  success: boolean
  loyalty?: LoyaltyPoints
  transactions?: PointsTransaction[]
  tiers?: RewardTier[]
  error?: string
}> {
  try {
    // Fetch customer data from Medusa
    const { customer } = await sdk.store.customer.retrieve()
    
    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    // Extract loyalty data from customer metadata (or use defaults)
    // In production, this would come from a loyalty module
    const loyalty: LoyaltyPoints = {
      points: (customer.metadata?.loyalty_points as number) || 0,
      tier: (customer.metadata?.loyalty_tier as string) || "Bronze",
      tierProgress: (customer.metadata?.tier_progress as number) || 0,
      nextTierPoints: (customer.metadata?.next_tier_points as number) || 500,
      lifetimePoints: (customer.metadata?.lifetime_points as number) || 0,
    }

    // Generate sample transactions based on points
    // In production, this would be fetched from a loyalty transactions table
    const transactions: PointsTransaction[] = [
      {
        id: "1",
        type: "earned",
        points: 150,
        description: "Welcome bonus",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "2",
        type: "earned",
        points: 75,
        description: "Purchase reward",
        date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        orderId: "ord_123456",
      },
      {
        id: "3",
        type: "redeemed",
        points: 50,
        description: "Discount redemption",
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "4",
        type: "earned",
        points: 200,
        description: "Purchase reward",
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        orderId: "ord_789012",
      },
      {
        id: "5",
        type: "earned",
        points: 100,
        description: "Referral bonus",
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "6",
        type: "redeemed",
        points: 100,
        description: "Free product",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]

    return {
      success: true,
      loyalty,
      transactions,
      tiers: REWARD_TIERS,
    }
  } catch (error: any) {
    console.error("Get loyalty data error:", error)
    return { success: false, error: error.message || "Failed to fetch loyalty data" }
  }
}

export async function redeemPointsAction(points: number): Promise<{ success: boolean; error?: string }> {
  try {
    // In production, this would call a loyalty module to redeem points
    // For now, we'll just simulate the redemption
    console.log(`Redeeming ${points} points`)
    return { success: true }
  } catch (error: any) {
    console.error("Redeem points error:", error)
    return { success: false, error: error.message || "Failed to redeem points" }
  }
}
