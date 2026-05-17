"use server"

import { getRelatedProducts } from "@/lib/medusa/products"
import { getPricingContext } from "@/lib/medusa/regions.server"
import type { MedusaProduct } from "@/lib/medusa/types"

export async function getFrequentlyBoughtTogetherAction(
  productId: string,
  limit = 4
): Promise<MedusaProduct[]> {
  try {
    const pricing = await getPricingContext()
    const products = await getRelatedProducts(productId, limit, pricing)
    return products
  } catch (error) {
    console.error("Failed to fetch frequently bought together:", error)
    return []
  }
}

export async function getYouMayAlsoLikeAction(
  productId: string,
  limit = 6
): Promise<MedusaProduct[]> {
  try {
    // Get related products - same category but different product
    const pricing = await getPricingContext()
    const products = await getRelatedProducts(productId, limit, pricing)
    return products
  } catch (error) {
    console.error("Failed to fetch you may also like products:", error)
    return []
  }
}
