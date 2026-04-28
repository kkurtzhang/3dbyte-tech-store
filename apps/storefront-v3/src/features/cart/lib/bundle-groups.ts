import type { MedusaCartLineItem } from "@/lib/medusa/cart"

type BundleDisplayItem = {
  metadata?: unknown
  quantity?: number | null
}

export type BundleCartGroup<TItem extends BundleDisplayItem = MedusaCartLineItem> = {
  type: "bundle"
  bundleId: string
  bundleTitle: string | null
  bundleProductHandle: string | null
  quantity: number
  items: TItem[]
}

export type CartDisplayGroup<TItem extends BundleDisplayItem = MedusaCartLineItem> =
  | {
      type: "item"
      item: TItem
    }
  | BundleCartGroup<TItem>

function getPositiveNumber(value: unknown) {
  if (typeof value === "number" && value > 0) {
    return value
  }

  if (typeof value === "string") {
    const parsedValue = Number.parseFloat(value)
    if (Number.isFinite(parsedValue) && parsedValue > 0) {
      return parsedValue
    }
  }

  return null
}

function getBundleMetadata(item: BundleDisplayItem) {
  const metadata = item.metadata as Record<string, unknown> | null | undefined
  const bundleId =
    typeof metadata?.bundle_key === "string"
      ? metadata.bundle_key
      : typeof metadata?.bundle_id === "string"
        ? metadata.bundle_id
        : null

  if (!bundleId) {
    return null
  }

  const bundleItemQuantity = getPositiveNumber(metadata?.bundle_item_quantity)
  const bundleQuantityFromMetadata = getPositiveNumber(metadata?.bundle_quantity)
  const derivedBundleQuantity =
    bundleItemQuantity &&
    typeof item.quantity === "number" &&
    item.quantity % bundleItemQuantity === 0
      ? item.quantity / bundleItemQuantity
      : null

  return {
    bundleId,
    bundleTitle:
      typeof metadata?.bundle_title === "string" ? metadata.bundle_title : null,
    bundleProductHandle:
      typeof metadata?.bundle_product_handle === "string"
        ? metadata.bundle_product_handle
        : null,
    quantity: bundleQuantityFromMetadata ?? derivedBundleQuantity ?? 1,
  }
}

export function buildCartDisplayGroups<TItem extends BundleDisplayItem>(
  items: TItem[] | null | undefined
) {
  const groups: CartDisplayGroup<TItem>[] = []
  const bundleIndexById = new Map<string, number>()

  for (const item of items ?? []) {
    const bundleMetadata = getBundleMetadata(item)

    if (!bundleMetadata) {
      groups.push({
        type: "item",
        item,
      })
      continue
    }

    const existingIndex = bundleIndexById.get(bundleMetadata.bundleId)

    if (existingIndex !== undefined) {
      const existingGroup = groups[existingIndex]
      if (existingGroup?.type === "bundle") {
        existingGroup.items = [...existingGroup.items, item]
      }
      continue
    }

    bundleIndexById.set(bundleMetadata.bundleId, groups.length)
    groups.push({
      type: "bundle",
      bundleId: bundleMetadata.bundleId,
      bundleTitle: bundleMetadata.bundleTitle,
      bundleProductHandle: bundleMetadata.bundleProductHandle,
      quantity: bundleMetadata.quantity,
      items: [item],
    })
  }

  return groups
}

export function getCartDisplayItemCount<TItem extends BundleDisplayItem>(
  groups: CartDisplayGroup<TItem>[]
) {
  return groups.reduce((count, group) => {
    if (group.type === "bundle") {
      return count + group.quantity
    }

    return count + (group.item.quantity ?? 0)
  }, 0)
}
