import { sdk } from "./client"

export type MedusaProduct = NonNullable<
  Awaited<ReturnType<typeof sdk.store.product.list>>["products"]
>[number]

export type MedusaProductVariant = NonNullable<MedusaProduct["variants"]>[number]

export type MedusaCollection = NonNullable<
  Awaited<ReturnType<typeof sdk.store.collection.list>>["collections"]
>[number]

export type MedusaProductCategory = NonNullable<
  Awaited<ReturnType<typeof sdk.store.category.list>>["product_categories"]
>[number]

export type MedusaOrder = NonNullable<
  Awaited<ReturnType<typeof sdk.store.order.retrieve>>["order"]
>
