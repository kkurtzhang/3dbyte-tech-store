import type { MedusaOrder, MedusaOrderLineItemWithPreorder } from "@/lib/medusa/types"
import { analyzeCartContents } from "@/lib/util/cart-analysis"
import { isPreorder } from "@/lib/util/is-preorder"

type OrderLifecycleTone = "default" | "processing" | "success" | "warning" | "destructive"

export type OrderLifecycleGroup = {
  id: "ready" | "preorder"
  title: string
  status: string
  description: string
  itemCount: number
  releaseDate?: Date | null
}

export type OrderLifecycle = {
  label: string
  description: string
  tone: OrderLifecycleTone
  groups: OrderLifecycleGroup[]
}

function getFulfillmentStatus(order: MedusaOrder) {
  return String(
    (order as MedusaOrder & { fulfillment_status?: string | null }).fulfillment_status ||
      "not_fulfilled"
  )
}

function getOrderStatus(order: MedusaOrder) {
  return String(order.status || "pending")
}

function isCanceled(order: MedusaOrder) {
  const status = getOrderStatus(order)

  return status === "canceled" || status === "cancelled"
}

function isRefunded(order: MedusaOrder) {
  return String(order.payment_status || "") === "refunded"
}

function countItems(items: MedusaOrder["items"] | null | undefined) {
  return (items ?? []).reduce((total, item) => total + (item.quantity || 0), 0)
}

function getPreorderReleaseDate(order: MedusaOrder) {
  return analyzeCartContents(order.items, order.currency_code).earliestPreorderDate
}

function partitionOrderItems(order: MedusaOrder) {
  const items = order.items ?? []
  const preorderItems = items.filter((item) =>
    isPreorder((item as MedusaOrderLineItemWithPreorder).variant?.preorder_variant)
  )
  const readyItems = items.filter(
    (item) =>
      !isPreorder((item as MedusaOrderLineItemWithPreorder).variant?.preorder_variant)
  )

  return {
    preorderItems,
    readyItems,
  }
}

function getReadyItemGroupStatus(fulfillmentStatus: string) {
  if (fulfillmentStatus === "delivered") {
    return "Delivered"
  }

  if (fulfillmentStatus === "shipped" || fulfillmentStatus === "partially_shipped") {
    return "Shipped"
  }

  if (fulfillmentStatus === "fulfilled" || fulfillmentStatus === "partially_fulfilled") {
    return "Preparing shipment"
  }

  return "Ready for fulfillment"
}

function getPreorderGroupStatus(order: MedusaOrder, fulfillmentStatus: string) {
  const releaseDate = getPreorderReleaseDate(order)

  if (fulfillmentStatus === "delivered") {
    return "Delivered"
  }

  if (fulfillmentStatus === "shipped") {
    return "Shipped"
  }

  if (fulfillmentStatus === "fulfilled") {
    return "Preparing shipment"
  }

  return releaseDate ? "Waiting for release" : "Waiting for availability"
}

export function getOrderLifecycle(order: MedusaOrder): OrderLifecycle {
  const fulfillmentStatus = getFulfillmentStatus(order)
  const { preorderItems, readyItems } = partitionOrderItems(order)
  const hasPreorderItems = preorderItems.length > 0
  const hasReadyItems = readyItems.length > 0
  const isMixedOrder = hasPreorderItems && hasReadyItems
  const releaseDate = getPreorderReleaseDate(order)

  if (isCanceled(order)) {
    return {
      label: "Canceled",
      description: "This order has been canceled.",
      tone: "destructive",
      groups: [],
    }
  }

  if (isRefunded(order)) {
    return {
      label: "Refunded",
      description: "This order has been refunded.",
      tone: "destructive",
      groups: [],
    }
  }

  if (fulfillmentStatus === "delivered") {
    return {
      label: "Delivered",
      description: "All items in this order have been delivered.",
      tone: "success",
      groups: [],
    }
  }

  if (isMixedOrder) {
    const readyStatus = getReadyItemGroupStatus(fulfillmentStatus)
    const preorderStatus = getPreorderGroupStatus(order, fulfillmentStatus)
    const readyDescription =
      fulfillmentStatus === "partially_shipped" || fulfillmentStatus === "shipped"
        ? "Regular items have left our warehouse."
        : fulfillmentStatus === "partially_fulfilled" || fulfillmentStatus === "fulfilled"
          ? "Regular items are being packed for shipment."
          : "Regular items can be fulfilled first by our team."
    const preorderDescription = releaseDate
      ? "Pre-order items will be fulfilled after their release date."
      : "Pre-order items will be fulfilled once available."

    return {
      label:
        fulfillmentStatus === "partially_shipped"
          ? "Partially shipped"
          : fulfillmentStatus === "partially_fulfilled"
            ? "Partially fulfilled"
            : "Awaiting split fulfillment",
      description:
        "This order contains ready-to-ship and pre-order items. They may ship separately under the same order.",
      tone:
        fulfillmentStatus === "partially_shipped" ||
        fulfillmentStatus === "partially_fulfilled"
          ? "processing"
          : "warning",
      groups: [
        {
          id: "ready",
          title: "Ready-to-ship items",
          status: readyStatus,
          description: readyDescription,
          itemCount: countItems(readyItems),
        },
        {
          id: "preorder",
          title: "Pre-order items",
          status: preorderStatus,
          description: preorderDescription,
          itemCount: countItems(preorderItems),
          releaseDate,
        },
      ],
    }
  }

  if (hasPreorderItems) {
    return {
      label:
        fulfillmentStatus === "shipped"
          ? "Pre-order shipped"
          : fulfillmentStatus === "fulfilled"
            ? "Preparing pre-order shipment"
            : "Awaiting pre-order release",
      description: releaseDate
        ? "Your pre-order will ship after its release date."
        : "Your pre-order will ship once it becomes available.",
      tone: fulfillmentStatus === "shipped" ? "success" : "warning",
      groups: [
        {
          id: "preorder",
          title: "Pre-order items",
          status: getPreorderGroupStatus(order, fulfillmentStatus),
          description: releaseDate
            ? "Pre-order items will be fulfilled after their release date."
            : "Pre-order items will be fulfilled once available.",
          itemCount: countItems(preorderItems),
          releaseDate,
        },
      ],
    }
  }

  if (fulfillmentStatus === "shipped" || fulfillmentStatus === "partially_shipped") {
    return {
      label: fulfillmentStatus === "partially_shipped" ? "Partially shipped" : "Shipped",
      description: "Your order is on the way.",
      tone: "success",
      groups: [],
    }
  }

  if (fulfillmentStatus === "fulfilled" || fulfillmentStatus === "partially_fulfilled") {
    return {
      label: fulfillmentStatus === "partially_fulfilled" ? "Partially fulfilled" : "Preparing shipment",
      description: "Your order is being prepared for shipment.",
      tone: "processing",
      groups: [],
    }
  }

  return {
    label: "Processing",
    description: "Your order has been received and is waiting for fulfillment.",
    tone: "default",
    groups: [],
  }
}

export function getOrderLifecycleToneClass(tone: OrderLifecycleTone) {
  switch (tone) {
    case "success":
      return "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
    case "processing":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "destructive":
      return "border-destructive/50 bg-destructive/10 text-destructive"
    default:
      return "border-border bg-card text-foreground"
  }
}
