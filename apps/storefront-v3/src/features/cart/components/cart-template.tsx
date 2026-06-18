"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartPageSkeleton } from "@/components/loading/storefront-page-skeletons";
import { useCart } from "@/context/cart-context";
import { useSavedItems } from "@/context/saved-items-context";
import { CartItem } from "./cart-item";
import { CartNotices } from "./cart-notices";
import { BundleCartGroup } from "./bundle-cart-group";
import { CartPromotionForm } from "./cart-promotion-form";
import { buildCartDisplayGroups, getCartDisplayItemCount } from "../lib/bundle-groups";
import { resolveCartItemsSubtotalInclTax } from "../lib/cart-totals";
import { OrderTotalsSummary } from "@/features/order/components/order-totals-summary";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CartTemplate() {
  const { cart, isLoading } = useCart();
  const { savedItems } = useSavedItems();

  const itemCount = useMemo(() => {
    return getCartDisplayItemCount(buildCartDisplayGroups(cart?.items));
  }, [cart]);

  // Assuming USD for now or fallback to first item currency
  const currencyCode = cart?.region?.currency_code || "usd";

  const subtotal = useMemo(() => {
    return resolveCartItemsSubtotalInclTax(cart, currencyCode);
  }, [cart, currencyCode]);

  const cartDisplayGroups = useMemo(() => buildCartDisplayGroups(cart?.items), [cart?.items]);
  const discountTotal = cart?.discount_total ?? 0;
  const orderTotal =
    typeof cart?.total === "number"
      ? cart.total
      : Math.max(0, subtotal - discountTotal);

  if (isLoading && !cart) {
    return <CartPageSkeleton />;
  }

  if (!cart || cart.items?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center py-12">
        {/* Empty Cart Illustration */}
        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-primary/5 blur-2xl" />
          <svg
            className="relative h-48 w-48 text-muted-foreground/80"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Shopping Cart Base */}
            <path
              d="M20 20 L40 20 L45 85 L180 85"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-sm"
            />
            {/* Cart Body */}
            <path
              d="M45 85 L55 150 L165 150 L175 85 Z"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinejoin="round"
              fill="none"
              className="drop-shadow-sm"
            />
            {/* Cart Handle */}
            <path
              d="M20 20 L30 15 L55 15"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Wheels */}
            <circle cx="65" cy="165" r="12" fill="currentColor" className="text-primary/60" />
            <circle cx="155" cy="165" r="12" fill="currentColor" className="text-primary/60" />
            {/* Empty Box Indicator */}
            <rect
              x="70"
              y="100"
              width="60"
              height="30"
              rx="4"
              fill="currentColor"
              className="text-primary/30"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Question Mark */}
            <text
              x="100"
              y="122"
              textAnchor="middle"
              fill="currentColor"
              className="text-sm font-bold"
              style={{ fontSize: "16px" }}
            >
              ?
            </text>
          </svg>
        </div>

        {/* Text Content */}
        <div className="space-y-3 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Your cart is empty
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Looks like you haven't added anything yet. Start shopping to fill up
            your cart with amazing products!
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button
            asChild
            size="lg"
            className="text-lg px-8 bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Link href="/shop" className="flex items-center gap-2">
              Continue Shopping
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="pt-8 border-t border-border/50 mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Need inspiration? Check out our popular categories:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/shop?category=new-arrivals"
              className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
            >
              New Arrivals
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link
              href="/shop?category=bestsellers"
              className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
            >
              Best Sellers
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link
              href="/shop?category=sale"
              className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
            >
              Sale Items
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Shopping Cart{" "}
            <span className="text-muted-foreground text-lg font-normal">({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
          </h1>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="divide-y p-1">
            {cartDisplayGroups.map((group) =>
              group.type === "bundle" ? (
                <div
                  key={group.bundleId}
                  className="px-4 py-3"
                >
                  <BundleCartGroup group={group} currencyCode={currencyCode} />
                </div>
              ) : (
                <div
                  key={group.item.id}
                  className="px-4 hover:bg-muted/30 transition-colors"
                >
                  <CartItem item={group.item} currencyCode={currencyCode} />
                </div>
              )
            )}
          </div>
        </div>

        {/* Saved Items Section */}
        {savedItems.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight font-mono uppercase flex items-center gap-2">
                <Bookmark className="h-5 w-5" />
                Saved for Later
              </h2>
            </div>
            <div className="rounded-lg border bg-card">
              <div className="divide-y p-1">
                {savedItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="px-4 hover:bg-muted/30 transition-colors"
                  >
                    <CartItem item={item} currencyCode={currencyCode} showSaveForLater={false} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-4">
        <Card className="sticky top-24">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <CartNotices items={cart.items} currencyCode={currencyCode} />
            <CartPromotionForm promotions={cart.promotions} />
            <OrderTotalsSummary
              currencyCode={currencyCode}
              discountTotal={discountTotal}
              shippingLabel="Calculated at checkout"
              shippingTotal={null}
              subtotal={subtotal}
              taxTotal={cart.tax_total ?? 0}
              total={orderTotal}
            />
          </CardContent>
          <CardFooter>
            <Button
              className="w-full group"
              size="lg"
              asChild
            >
              <Link href="/checkout">
                Proceed to Checkout
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
