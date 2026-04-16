import type { MedusaCartLineItem } from "@/lib/medusa/cart"

export type BundleCartGroup = {
  type: "bundle"
  bundleId: string
  bundleTitle: string | null
  bundleProductHandle: string | null
  quantity: number
  items: MedusaCartLineItem[]
}

export type CartDisplayGroup =
  | {
      type: "item"
      item: MedusaCartLineItem
    }
  | BundleCartGroup

function getBundleMetadata(item: MedusaCartLineItem) {
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

  const bundleItemQuantity =
    typeof metadata?.bundle_item_quantity === "number" && metadata.bundle_item_quantity > 0
      ? metadata.bundle_item_quantity
      : null
  const bundleQuantityFromMetadata =
    typeof metadata?.bundle_quantity === "number" && metadata.bundle_quantity > 0
      ? metadata.bundle_quantity
      : null
  const derivedBundleQuantity =
    bundleItemQuantity && item.quantity % bundleItemQuantity === 0
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

export function buildCartDisplayGroups(items: MedusaCartLineItem[] | null | undefined) {
  const groups: CartDisplayGroup[] = []
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

export function getCartDisplayItemCount(groups: CartDisplayGroup[]) {
  return groups.reduce((count, group) => {
    if (group.type === "bundle") {
      return count + group.quantity
    }

    return count + group.item.quantity
  }, 0)
}
