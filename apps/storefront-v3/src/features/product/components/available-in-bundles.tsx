"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useCart } from "@/context/cart-context"
import { getProductPath, type BundleProduct } from "@/lib/medusa/bundles"
import type { MedusaProduct, MedusaProductVariant } from "@/lib/medusa/types"
import {
  getBundlePricingSummary,
  getVariantPriceSnapshot,
} from "@/features/product/lib/bundle-pricing"
import { useToast } from "@/lib/hooks/use-toast"
import { formatCustomerPrice } from "@/lib/pricing/customer-pricing"

interface AvailableInBundlesProps {
  bundles: BundleProduct[]
  product: MedusaProduct
  selectedVariant?: MedusaProductVariant
}

type BuildAddOnOption = {
  id: string
  title: string
  quantity: number
  variantId: string
  price: number
  currencyCode: string
}

const MAX_BUILD_ADD_ONS = 4

function formatMoney(amount: number, currencyCode = "AUD") {
  return formatCustomerPrice(amount, currencyCode)
}

function buildSelectedVariantsByItemId(
  bundle: BundleProduct,
  productId: string,
  selectedVariantId?: string
) {
  if (!selectedVariantId) {
    return {}
  }

  return Object.fromEntries(
    bundle.items
      .filter((item) => item.product.id === productId)
      .map((item) => [item.id, selectedVariantId])
  )
}

function getAdditionalItems(bundle: BundleProduct, currentProductId: string) {
  return bundle.items.filter((item) => item.product.id !== currentProductId)
}

function getBuildAddOnOptions(
  bundles: BundleProduct[],
  currentProductId: string
): BuildAddOnOption[] {
  const addOns = bundles.flatMap((bundle) =>
    getAdditionalItems(bundle, currentProductId)
      .map((item) => {
        const priceSnapshot = getVariantPriceSnapshot(item.product)
        const variantId = priceSnapshot.variant?.id

        if (!variantId) {
          return null
        }

        return {
          id: item.product.id,
          title: item.product.title,
          quantity: item.quantity,
          variantId,
          price: priceSnapshot.amount,
          currencyCode: priceSnapshot.currencyCode,
        }
      })
      .filter((item): item is BuildAddOnOption => item !== null)
  )

  return addOns
    .filter(
      (addOn, index, allAddOns) =>
        allAddOns.findIndex((candidate) => candidate.id === addOn.id) === index
    )
    .slice(0, MAX_BUILD_ADD_ONS)
}

export function AvailableInBundles({
  bundles,
  product,
  selectedVariant,
}: AvailableInBundlesProps) {
  const { addItem } = useCart()
  const { toast } = useToast()
  const [isAdding, setIsAdding] = useState(false)
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const currentVariantId = selectedVariant?.id ?? product.variants?.[0]?.id
  const currentProductPrice = getVariantPriceSnapshot(product, currentVariantId)

  const sortedBundles = useMemo(() => {
    return [...bundles].sort((left, right) => {
      const leftSavings = getBundlePricingSummary(
        left,
        buildSelectedVariantsByItemId(left, product.id, currentVariantId)
      ).savings
      const rightSavings = getBundlePricingSummary(
        right,
        buildSelectedVariantsByItemId(right, product.id, currentVariantId)
      ).savings

      if (rightSavings !== leftSavings) {
        return rightSavings - leftSavings
      }

      return (left.product?.title || left.title).localeCompare(
        right.product?.title || right.title
      )
    })
  }, [bundles, currentVariantId, product.id])

  const buildAddOns = useMemo(
    () => getBuildAddOnOptions(sortedBundles, product.id),
    [product.id, sortedBundles]
  )
  const selectedBuildAddOns = buildAddOns.filter((addOn) =>
    selectedAddOnIds.has(addOn.id)
  )
  const selectedBuildItemCount =
    (currentVariantId ? 1 : 0) + selectedBuildAddOns.length

  if (bundles.length === 0) {
    return null
  }

  const toggleBuildAddOn = (addOnId: string) => {
    setSelectedAddOnIds((current) => {
      const nextSelectedIds = new Set(current)

      if (nextSelectedIds.has(addOnId)) {
        nextSelectedIds.delete(addOnId)
        return nextSelectedIds
      }

      nextSelectedIds.add(addOnId)
      return nextSelectedIds
    })
  }

  const handleAddSelectedBuildItems = async () => {
    if (!currentVariantId) {
      return
    }

    const buildItems = [
      {
        variantId: currentVariantId,
        quantity: 1,
      },
      ...selectedBuildAddOns.map((addOn) => ({
        variantId: addOn.variantId,
        quantity: addOn.quantity,
      })),
    ]

    setIsAdding(true)

    try {
      for (const item of buildItems) {
        await addItem(item.variantId, item.quantity)
      }

      toast({
        title: "Build items added",
        description: `${buildItems.length} build item${
          buildItems.length === 1 ? " has" : "s have"
        } been added to your cart.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to add build items",
        description:
          "Unable to add these build items to your cart. Please try again.",
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="rounded-lg border bg-secondary/10 p-4">
      <div className="mb-4">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">
          Bundle Discovery
        </p>
        <h2 className="mt-1 text-lg font-semibold">Complete your build</h2>
        <p className="text-sm text-muted-foreground">
          Start with this product, then add the practical extras that fit your
          build.
        </p>
      </div>

      <div className="mb-5 space-y-3 border-y py-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id={`build-item-${product.id}`}
            checked
            disabled
            aria-label={`${product.title} required build item`}
          />
          <div className="min-w-0 flex-1">
            <Label
              htmlFor={`build-item-${product.id}`}
              className="block text-sm font-semibold leading-5"
            >
              {product.title}
            </Label>
            <p className="mt-1 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Required starter item
            </p>
          </div>
          <div className="text-right text-sm font-medium">
            {formatMoney(
              currentProductPrice.amount,
              currentProductPrice.currencyCode
            )}
          </div>
        </div>

        {buildAddOns.length > 0 ? (
          <div className="space-y-3 border-t pt-3">
            {buildAddOns.map((addOn) => {
              const isSelected = selectedAddOnIds.has(addOn.id)
              const checkboxId = `build-add-on-${addOn.id}`

              return (
                <div key={addOn.id} className="flex items-start gap-3">
                  <Checkbox
                    id={checkboxId}
                    checked={isSelected}
                    onCheckedChange={() => toggleBuildAddOn(addOn.id)}
                    aria-label={`${addOn.title} optional build add-on`}
                  />
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor={checkboxId}
                      className="block text-sm font-medium leading-5"
                    >
                      {addOn.title}
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Optional add-on - Qty {addOn.quantity}
                    </p>
                  </div>
                  <div className="text-right text-sm font-medium">
                    {formatMoney(
                      addOn.price * addOn.quantity,
                      addOn.currencyCode
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        <Button
          type="button"
          className="w-full font-mono uppercase tracking-widest"
          disabled={!currentVariantId || isAdding}
          onClick={handleAddSelectedBuildItems}
        >
          {isAdding
            ? "Adding build items..."
            : `Add Selected Build Items (${selectedBuildItemCount})`}
        </Button>
      </div>

      <h3 className="mb-3 text-sm font-semibold">Available in Bundles</h3>
      <div className="space-y-3">
        {sortedBundles.map((bundle) => {
          const bundleHandle = bundle.product?.handle
          const bundleTitle = bundle.product?.title || bundle.title
          const selectedVariantsByItemId = buildSelectedVariantsByItemId(
            bundle,
            product.id,
            currentVariantId
          )
          const {
            bundlePrice,
            compareAtPrice,
            savings,
            savingsPercentage,
            currencyCode,
          } = getBundlePricingSummary(bundle, selectedVariantsByItemId)
          const additionalItems = getAdditionalItems(bundle, product.id).slice(
            0,
            3
          )

          return (
            <div
              key={bundle.id}
              className="rounded-xl border bg-background p-4"
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_220px] lg:items-start">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-start gap-2">
                    {bundleHandle ? (
                      <Link
                        href={getProductPath(bundleHandle, true)}
                        className="min-w-0 text-base font-semibold leading-snug hover:text-primary"
                      >
                        {bundleTitle}
                      </Link>
                    ) : (
                      <p className="text-base font-semibold leading-snug">
                        {bundleTitle}
                      </p>
                    )}
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px] uppercase tracking-wider"
                    >
                      {bundle.items.length} item
                      {bundle.items.length === 1 ? "" : "s"}
                    </Badge>
                    {savingsPercentage > 0 ? (
                      <Badge className="font-mono text-[10px] uppercase tracking-wider">
                        Save {savingsPercentage}%
                      </Badge>
                    ) : null}
                  </div>

                  {additionalItems.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                        Also includes
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-foreground/90">
                        {additionalItems.map((item, index) => (
                          <span
                            key={item.id}
                            className="inline-flex min-w-0 items-center gap-1"
                          >
                            <span>{item.quantity} x</span>
                            {item.product.handle ? (
                              <Link
                                href={getProductPath(item.product.handle)}
                                className="min-w-0 truncate hover:text-primary hover:underline"
                              >
                                {item.product.title}
                              </Link>
                            ) : (
                              <span className="min-w-0 truncate">
                                {item.product.title}
                              </span>
                            )}
                            {index < additionalItems.length - 1 ? (
                              <span>,</span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border bg-secondary/20 px-4 py-3 lg:text-right">
                  <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                    From
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {formatMoney(bundlePrice, currencyCode)}
                  </p>
                  {savings > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground line-through">
                        {formatMoney(compareAtPrice, currencyCode)}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
