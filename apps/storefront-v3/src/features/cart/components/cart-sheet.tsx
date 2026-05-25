"use client"

import { useEffect, useMemo, useState } from "react"
import { ShoppingCart } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/context/cart-context"
import { getCompactCartNoticeLines } from "./cart-notices"
import { CartItem } from "./cart-item"
import { BundleCartGroup } from "./bundle-cart-group"
import { buildCartDisplayGroups, getCartDisplayItemCount } from "../lib/bundle-groups"
import { resolveCartItemsSubtotalInclTax } from "../lib/cart-totals"

export function CartSheet() {
  const { cart, isLoading } = useCart()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const cartDisplayGroups = useMemo(() => buildCartDisplayGroups(cart?.items), [cart?.items])

  const itemCount = useMemo(() => {
    return getCartDisplayItemCount(cartDisplayGroups)
  }, [cartDisplayGroups])

  // Assuming USD for now or fallback to first item currency
  const currencyCode = cart?.region?.currency_code || "usd"

  const subtotal = useMemo(() => {
    return resolveCartItemsSubtotalInclTax(cart, currencyCode)
  }, [cart, currencyCode])

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const compactNoticeLines = useMemo(
    () => getCompactCartNoticeLines(cart?.items, currencyCode),
    [cart?.items, currencyCode]
  )

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          <span className="sr-only">
            Open cart{itemCount > 0 ? `, ${itemCount} ${itemCount === 1 ? "item" : "items"}` : ""}
          </span>
          {itemCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground"
            >
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col pr-0 sm:max-w-md">
        <SheetHeader className="px-1">
          <SheetTitle className="font-mono uppercase tracking-wider">
            Cart ({itemCount})
          </SheetTitle>
        </SheetHeader>

        <Separator className="my-4" />

        <div className="flex-1 overflow-y-auto pr-6">
          {isLoading && !cart ? (
             <div className="flex h-full items-center justify-center text-sm text-muted-foreground font-mono">
                Loading cart...
             </div>
          ) : !cart || cart.items?.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-2">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">Your cart is empty</p>
              <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                Add products to your cart to get started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {cartDisplayGroups.map((group) =>
                group.type === "bundle" ? (
                  <div key={group.bundleId} className="py-3">
                    <BundleCartGroup group={group} currencyCode={currencyCode} />
                  </div>
                ) : (
                  <CartItem key={group.item.id} item={group.item} currencyCode={currencyCode} />
                )
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 pr-6 pt-4">
          <Separator />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Subtotal</span>
              <span className="font-mono font-bold">
                 {formatPrice(subtotal, currencyCode)}
              </span>
            </div>
            {compactNoticeLines.map((line) => (
              <p key={line} className="text-xs text-muted-foreground">
                {line}
              </p>
            ))}
            <p className="text-xs text-muted-foreground">
               Taxes and shipping calculated at checkout.
            </p>
          </div>
          <SheetFooter>
             <Button
                className="w-full font-mono uppercase tracking-widest"
                size="lg"
                asChild
                disabled={!cart || cart.items?.length === 0}
                onClick={() => setOpen(false)}
              >
               <Link href="/checkout">
                Proceed to Checkout
               </Link>
             </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}
