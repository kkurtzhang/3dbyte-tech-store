import { sdk } from "./client"
import type { MedusaProduct, MedusaProductCategory } from "./types"
import type { PricingContext } from "./regions"

export async function getCategoryByHandle(
  handle: string[]
): Promise<MedusaProductCategory | null> {
  try {
    // Fetch all categories and find the one matching the full handle path
    const response = await sdk.store.category.list({
      limit: 100,
    })

    // Find category matching full handle path
    const category = response.product_categories?.find((cat) => {
      const catHandle = cat.handle || ""
      const segments = catHandle.split("/").filter(Boolean)
      return JSON.stringify(segments) === JSON.stringify(handle)
    })

    return category || null
  } catch (error) {
    console.warn(`Failed to fetch category by handle: ${handle.join("/")}`, error)
    return null
  }
}

export async function getCategories(): Promise<MedusaProductCategory[]> {
  try {
    const response = await sdk.store.category.list({
      limit: 100,
    })

    return response.product_categories || []
  } catch (error) {
    console.warn("Failed to fetch categories", error)
    return []
  }
}

export async function getProductsByCategory(
  categoryId: string,
  params: {
    page?: number
    limit?: number
  } & Partial<PricingContext>
): Promise<{ products: MedusaProduct[]; count: number }> {
  const { page = 1, limit = 20 } = params

  const { products, count } = await sdk.store.product.list({
    category_id: [categoryId],
    limit,
    offset: (page - 1) * limit,
    ...(params.region_id ? { region_id: params.region_id } : {}),
    ...(params.country_code ? { country_code: params.country_code } : {}),
    fields:
      "*variants.calculated_price,*variants.prices,*variants.inventory_quantity,*variants.manage_inventory",
  })

  return {
    products,
    count,
  }
}
