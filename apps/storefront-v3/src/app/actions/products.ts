"use server"

import { getRelatedProducts } from "@/lib/medusa/products"
import { StoreProduct } from "@medusajs/types"

export async function getFrequentlyBoughtTogetherAction(
  productId: string,
  limit = 4
): Promise<StoreProduct[]> {
  try {
    const products = await getRelatedProducts(productId, limit)
    return products
  } catch (error) {
    console.error("Failed to fetch frequently bought together:", error)
    return []
  }
}

export async function getYouMayAlsoLikeAction(
  productId: string,
  limit = 6
): Promise<StoreProduct[]> {
  try {
    // Get related products - same category but different product
    const products = await getRelatedProducts(productId, limit)
    return products
  } catch (error) {
    console.error("Failed to fetch you may also like products:", error)
    return []
  }
}
