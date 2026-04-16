"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { useToast } from "@/lib/hooks/use-toast"
import { PriceDisplay } from "@/components/ui/price-display"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { SocialShare } from "./social-share"
import type { BundleProduct } from "@/lib/medusa/bundles"
import type { MedusaProduct } from "@/lib/medusa/types"
import { cn } from "@/lib/utils"
import {
  getBundleInventorySummary,
  getBundleItemPricing,
  getBundlePricingSummary,
  getRenderableOptions,
  getSelectedVariantLabel,
  isBundleVariantPurchasable,
} from "@/features/product/lib/bundle-pricing"

interface BundleProductActionsProps {
  product: MedusaProduct
  bundleProduct: BundleProduct
}

function getInitialSelections(bundleProduct: BundleProduct) {
  const selectedVariants: Record<string, string> = {}
  const selectedOptions: Record<string, Record<string, string>> = {}

  for (const item of bundleProduct.items) {
    const preferredVariant =
      item.product.variants?.find((variant) => isBundleVariantPurchasable(variant)) ??
      item.product.variants?.[0]

    if (!preferredVariant?.id) {
      continue
    }

    selectedVariants[item.id] = preferredVariant.id
    selectedOptions[item.id] = Object.fromEntries(
      (preferredVariant.options ?? [])
        .filter((option) => option.option_id && option.value)
        .map((option) => [option.option_id as string, option.value as string])
    )
  }

  return {
    selectedVariants,
    selectedOptions,
  }
}

function formatMoney(amount: number, currencyCode = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(amount)
}

function BundleInventoryBadge({
  status,
}: {
  status: "in-stock" | "low-stock" | "out-of-stock" | "preorder" | "unknown"
}) {
  if (status === "unknown") {
    return null
  }

  if (status === "out-of-stock") {
    return (
      <Badge variant="destructive" className="gap-1.5 px-3 py-1.5 text-sm font-medium">
        <XCircle className="h-4 w-4" />
        Out of Stock
      </Badge>
    )
  }

  if (status === "low-stock") {
    return (
      <Badge
        variant="secondary"
        className="gap-1.5 border-yellow-300 bg-yellow-100 px-3 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
      >
        <AlertTriangle className="h-4 w-4" />
        Low Stock
      </Badge>
    )
  }

  if (status === "preorder") {
    return (
      <Badge
        variant="secondary"
        className="gap-1.5 border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
      >
        <AlertTriangle className="h-4 w-4" />
        Pre-order
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      className="gap-1.5 border-green-300 bg-green-100 px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/30"
    >
      <CheckCircle2 className="h-4 w-4" />
      In Stock
    </Badge>
  )
}

export function BundleProductActions({
  product,
  bundleProduct,
}: BundleProductActionsProps) {
  const { addBundle } = useCart()
  const { toast } = useToast()
  const [isAdding, setIsAdding] = useState(false)
  const [bundleQuantity, setBundleQuantity] = useState(1)
  const initialSelections = useMemo(
    () => getInitialSelections(bundleProduct),
    [bundleProduct]
  )
  const [selectedVariantsByItemId, setSelectedVariantsByItemId] = useState<Record<string, string>>(
    initialSelections.selectedVariants
  )
  const [selectedOptionsByItemId, setSelectedOptionsByItemId] = useState<
    Record<string, Record<string, string>>
  >(initialSelections.selectedOptions)

  useEffect(() => {
    setSelectedVariantsByItemId(initialSelections.selectedVariants)
    setSelectedOptionsByItemId(initialSelections.selectedOptions)
  }, [initialSelections])

  const bundleInventory = useMemo(
    () => getBundleInventorySummary(bundleProduct, selectedVariantsByItemId),
    [bundleProduct, selectedVariantsByItemId]
  )

  const priceInfo = useMemo(() => {
    const summary = getBundlePricingSummary(bundleProduct, selectedVariantsByItemId)

    return {
      price: {
        amount: summary.bundlePrice,
        currency_code: summary.currencyCode,
      },
      originalPrice:
        summary.compareAtPrice > summary.bundlePrice
          ? summary.compareAtPrice
          : undefined,
      discountPercentage:
        summary.compareAtPrice > summary.bundlePrice
          ? summary.savingsPercentage
          : undefined,
    }
  }, [bundleProduct, selectedVariantsByItemId])

  const allBundleItemsSelected = bundleProduct.items.every((item) => {
    return Boolean(selectedVariantsByItemId[item.id])
  })
  const isOutOfStock = bundleInventory.status === "out-of-stock"
  const maxBundleQuantity = bundleInventory.availableQuantity

  const handleBundleOptionChange = (
    bundleItemId: string,
    optionId: string,
    value: string
  ) => {
    const currentOptions = selectedOptionsByItemId[bundleItemId] ?? {}
    const nextOptions = {
      ...currentOptions,
      [optionId]: value,
    }

    setSelectedOptionsByItemId((current) => ({
      ...current,
      [bundleItemId]: nextOptions,
    }))

    const bundleItem = bundleProduct.items.find((item) => item.id === bundleItemId)
    if (!bundleItem) {
      return
    }

    const nextVariant = bundleItem.product.variants?.find((variant) => {
      return variant.options?.every((option) => {
        return option.option_id && nextOptions[option.option_id] === option.value
      })
    })

    if (nextVariant?.id) {
      setSelectedVariantsByItemId((current) => ({
        ...current,
        [bundleItemId]: nextVariant.id,
      }))
    }
  }

  useEffect(() => {
    if (maxBundleQuantity !== null && bundleQuantity > maxBundleQuantity) {
      setBundleQuantity(Math.max(1, maxBundleQuantity))
    }
  }, [bundleQuantity, maxBundleQuantity])

  const handleAddBundle = async () => {
    setIsAdding(true)

    try {
      await addBundle(
        bundleProduct.id,
        bundleQuantity,
        bundleProduct.items.map((item) => ({
          item_id: item.id,
          variant_id: selectedVariantsByItemId[item.id],
        }))
      )

      toast({
        title: "Bundle added to cart",
        description: `${bundleProduct.title} has been added to your cart.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to add bundle",
        description: "Unable to add this bundle to your cart. Please try again.",
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="border-b pb-6">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">
          Bundled Product
        </p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">{product.title}</h1>
        <div className="flex flex-wrap items-start gap-3">
          <PriceDisplay
            price={priceInfo.price}
            originalPrice={priceInfo.originalPrice}
            discountPercentage={priceInfo.discountPercentage}
            size="lg"
          />
          <BundleInventoryBadge
            status={bundleInventory.status}
          />
          <span className="rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {bundleProduct.items.length} bundle items
          </span>
        </div>
        {product.description ? (
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {product.description}
          </p>
        ) : null}
        {bundleInventory.status === "out-of-stock" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            This bundle is unavailable with the current variant selection.
          </p>
        ) : null}
      </div>

      <SocialShare
        productTitle={product.title}
        productDescription={product.description || undefined}
        productImage={product.thumbnail || undefined}
      />

      <div className="space-y-4">
        {bundleProduct.items.map((item, index) => {
          const itemProduct = item.product
          const selectedVariantId = selectedVariantsByItemId[item.id]
          const selectedVariantLabel = getSelectedVariantLabel(itemProduct, selectedVariantId)
          const renderableOptions = getRenderableOptions(itemProduct)
          const itemPricing = getBundleItemPricing(
            bundleProduct,
            item,
            selectedVariantsByItemId
          )

          return (
            <div key={item.id} className="rounded-lg border bg-card p-4">
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                    Item {index + 1}
                  </p>
                  {itemProduct.handle ? (
                    <Link
                      href={`/products/${itemProduct.handle}`}
                      className="text-lg font-semibold hover:text-primary"
                    >
                      {itemProduct.title}
                    </Link>
                  ) : (
                    <h3 className="text-lg font-semibold">{itemProduct.title}</h3>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Included quantity: {item.quantity}
                  </p>
                </div>

                <div className="grid gap-2 rounded-lg border bg-secondary/20 px-4 py-3 text-sm md:min-w-[220px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Standalone</span>
                    <span className="font-medium text-foreground">
                      {formatMoney(
                        itemPricing.standaloneTotalPrice,
                        itemPricing.currencyCode
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">In bundle</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(itemPricing.bundledTotalPrice, itemPricing.currencyCode)}
                    </span>
                  </div>
                  {itemPricing.savings > 0 ? (
                    <div className="flex items-center justify-between gap-4 border-t pt-2">
                      <span className="text-muted-foreground">You save</span>
                      <Badge className="font-mono text-[10px] uppercase tracking-wider">
                        {formatMoney(itemPricing.savings, itemPricing.currencyCode)}
                      </Badge>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                {renderableOptions.map((option) => (
                  <div key={option.id} className="space-y-2">
                    <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                      {option.title}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {option.values?.map((value) => {
                        const isSelected =
                          selectedOptionsByItemId[item.id]?.[option.id] === value.value

                        return (
                          <button
                            key={`${option.id}-${value.id}`}
                            type="button"
                            onClick={() =>
                              handleBundleOptionChange(item.id, option.id, value.value)
                            }
                            className={cn(
                              "rounded-sm border px-4 py-2 text-sm transition-colors",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "hover:border-primary/50 hover:text-primary"
                            )}
                          >
                            {value.value}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {selectedVariantLabel ? (
                  <p className="text-sm text-muted-foreground">
                    Selected variant:{" "}
                    <span className="font-medium text-foreground">
                      {selectedVariantLabel}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t pt-6">
        <div className="flex items-stretch gap-3">
          <div className="flex h-14 min-w-[132px] items-stretch overflow-hidden rounded-sm border bg-background">
            <button
              type="button"
              className="flex h-full w-12 items-center justify-center text-sm transition-colors hover:bg-secondary disabled:opacity-50"
              aria-label="Decrease bundle quantity"
              disabled={bundleQuantity <= 1 || isAdding}
              onClick={() => setBundleQuantity((current) => Math.max(1, current - 1))}
            >
              -
            </button>
            <span className="flex flex-1 items-center justify-center border-x font-mono text-sm">
              {bundleQuantity}
            </span>
            <button
              type="button"
              className="flex h-full w-12 items-center justify-center text-sm transition-colors hover:bg-secondary disabled:opacity-50"
              aria-label="Increase bundle quantity"
              disabled={
                isAdding ||
                isOutOfStock ||
                (maxBundleQuantity !== null && bundleQuantity >= maxBundleQuantity)
              }
              onClick={() => setBundleQuantity((current) => current + 1)}
            >
              +
            </button>
          </div>
          <Button
            size="lg"
            className="h-14 flex-1 font-mono text-lg uppercase tracking-widest"
            disabled={!allBundleItemsSelected || isAdding || isOutOfStock}
            onClick={handleAddBundle}
          >
            {isAdding
              ? "Adding bundle..."
              : isOutOfStock
                ? "Out of Stock"
                : "Add Bundle to Cart"}
          </Button>
        </div>
        <p className="mt-2 text-center text-xs font-mono text-muted-foreground">
          Each bundle item is added together and grouped in your cart.
        </p>
      </div>
    </div>
  )
}
