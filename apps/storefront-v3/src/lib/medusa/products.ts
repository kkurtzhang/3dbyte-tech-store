import { sdk } from "./client"
import { StoreProduct } from "@medusajs/types"

export async function getProducts(params: {
  page?: number
  limit?: number
  category_id?: string[]
  q?: string
}): Promise<{ products: StoreProduct[]; count: number }> {
  const { page = 1, limit = 20, category_id, q } = params

  const { products, count } = await sdk.store.product.list({
    limit,
    offset: (page - 1) * limit,
    category_id,
    q,
    fields: "*variants,*variants.prices",
  })

  return {
    products,
    count,
  }
}

export async function getProductByHandle(handle: string): Promise<StoreProduct | null> {
  try {
    const { products } = await sdk.store.product.list({
      handle,
      limit: 1,
      fields: "*variants,*variants.prices,*options,*options.values,*images,*type,*collection,*tags",
    })

    return products[0] || null
  } catch (error) {
    console.warn(`Failed to fetch product by handle: ${handle}`, error)
    return null
  }
}

export async function getProductHandles(): Promise<string[]> {
  try {
    const { products } = await sdk.store.product.list({
      limit: 100, // Reasonable limit for SSG
      fields: "handle",
    })

    return products.map((p) => p.handle)
  } catch (error) {
    console.warn("Failed to fetch product handles for SSG", error)
    return []
  }
}
