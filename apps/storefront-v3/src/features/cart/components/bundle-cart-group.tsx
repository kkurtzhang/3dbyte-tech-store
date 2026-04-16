"use client"

import Link from "next/link"
import { useState } from "react"
import { Trash2 } from "lucide-react"
import { useCart } from "@/context/cart-context"
import { Button } from "@/components/ui/button"
import { getProductPath } from "@/lib/medusa/bundles"
import { CartItem } from "./cart-item"
import type { BundleCartGroup } from "../lib/bundle-groups"

interface BundleCartGroupProps {
  group: BundleCartGroup
  currencyCode: string
}

export function BundleCartGroup({ group, currencyCode }: BundleCartGroupProps) {
  const { removeBundle, updateBundle } = useCart()
  const [isUpdating, setIsUpdating] = useState(false)

  const bundleTitle = group.bundleTitle ?? "Product Bundle"
  const itemCountLabel = `${group.items.length} ${group.items.length === 1 ? "item" : "items"}`
  const bundleTotal = group.items.reduce(
    (total, item) => total + item.unit_price * item.quantity,
    0
  )

  const formattedBundleTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(bundleTotal)

  const handleRemoveBundle = async () => {
    setIsUpdating(true)
    try {
      await removeBundle(group.bundleId)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateBundleQuantity = async (nextQuantity: number) => {
    if (nextQuantity < 1 || nextQuantity === group.quantity) {
      return
    }

    setIsUpdating(true)
    try {
      await updateBundle(group.bundleId, nextQuantity)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          {group.bundleProductHandle ? (
            <Link
              href={getProductPath(group.bundleProductHandle, true)}
              className="text-base font-semibold hover:text-primary"
            >
              {bundleTitle}
            </Link>
          ) : (
            <h3 className="text-base font-semibold">{bundleTitle}</h3>
          )}
          <p className="text-sm text-muted-foreground">{itemCountLabel}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-sm border bg-background">
            <button
              type="button"
              className="px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50"
              aria-label={`Decrease ${bundleTitle} quantity`}
              disabled={group.quantity <= 1 || isUpdating}
              onClick={() => handleUpdateBundleQuantity(group.quantity - 1)}
            >
              -
            </button>
            <span className="min-w-12 text-center font-mono text-sm">
              {isUpdating ? "..." : group.quantity}
            </span>
            <button
              type="button"
              className="px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50"
              aria-label={`Increase ${bundleTitle} quantity`}
              disabled={isUpdating}
              onClick={() => handleUpdateBundleQuantity(group.quantity + 1)}
            >
              +
            </button>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Bundle Total
            </p>
            <p className="font-mono text-lg font-semibold">{formattedBundleTotal}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Remove ${bundleTitle}`}
            disabled={isUpdating}
            onClick={handleRemoveBundle}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="divide-y p-1">
        {group.items.map((item) => (
          <div key={item.id} className="px-4 py-1">
            <CartItem item={item} currencyCode={currencyCode} showSaveForLater={false} readOnly />
          </div>
        ))}
      </div>
    </div>
  )
}
