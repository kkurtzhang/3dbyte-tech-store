"use client"

import { useMemo } from "react"
import { ShoppingCart } from "lucide-react"
import Link from "next/link"
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
import { CartItem } from "./cart-item"

export function CartSheet() {
  const { cart, isLoading } = useCart()

  const itemCount = useMemo(() => {
    return cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0
  }, [cart])

  const subtotal = useMemo(() => {
    if (!cart?.total) return 0
    return cart.total
  }, [cart])

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  // Assuming USD for now or fallback to first item currency
  const currencyCode = cart?.region?.currency_code || "usd"

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground">
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col pr-0 sm:max-w-md">
        <SheetHeader className="px-1">
          <SheetTitle className="font-mono uppercase tracking-wider">
            System_Inventory ({itemCount})
          </SheetTitle>
        </SheetHeader>

        <Separator className="my-4" />

        <div className="flex-1 overflow-y-auto pr-6">
          {isLoading && !cart ? (
             <div className="flex h-full items-center justify-center text-sm text-muted-foreground font-mono">
                Initializing_Module...
             </div>
          ) : !cart || cart.items?.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-2">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">Inventory Empty</p>
              <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                Add components to your system to proceed with acquisition.
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {cart.items?.map((item) => (
                <CartItem key={item.id} item={item} currencyCode={currencyCode} />
              ))}
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
            <p className="text-xs text-muted-foreground">
               Taxes and shipping calculated at next step.
            </p>
          </div>
          <SheetFooter>
             <Button
                className="w-full font-mono uppercase tracking-widest"
                size="lg"
                asChild
                disabled={!cart || cart.items?.length === 0}
              >
               <Link href="/checkout">
                Proceed_To_Checkout
               </Link>
             </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}
