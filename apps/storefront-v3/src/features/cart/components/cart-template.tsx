"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/context/cart-context";
import { CartItem } from "./cart-item";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CartTemplate() {
  const { cart, isLoading } = useCart();

  const itemCount = useMemo(() => {
    return cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  }, [cart]);

  const subtotal = useMemo(() => {
    if (!cart?.total) return 0;
    return cart.total;
  }, [cart]);

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  // Assuming USD for now or fallback to first item currency
  const currencyCode = cart?.region?.currency_code || "usd";

  if (isLoading && !cart) {
    return (
      <div className="flex h-[50vh] items-center justify-center font-mono text-sm text-muted-foreground animate-pulse">
        Initializing_Module...
      </div>
    );
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
          <h1 className="text-2xl font-bold tracking-tight font-mono uppercase">
            System_Inventory{" "}
            <span className="text-muted-foreground text-lg">({itemCount})</span>
          </h1>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="divide-y p-1">
            {cart.items?.map((item) => (
              <div
                key={item.id}
                className="px-4 hover:bg-muted/30 transition-colors"
              >
                <CartItem item={item} currencyCode={currencyCode} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-4">
        <Card className="sticky top-24">
          <CardHeader className="pb-4">
            <CardTitle className="font-mono uppercase tracking-wider text-lg">
              Order_Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono font-medium">
                {formatPrice(subtotal, currencyCode)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-muted-foreground italic">
                Calculated at checkout
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxes</span>
              <span className="text-muted-foreground italic">
                Calculated at checkout
              </span>
            </div>

            <Separator className="my-2" />

            <div className="flex items-center justify-between font-medium">
              <span>Total</span>
              <span className="font-mono text-xl text-primary">
                {formatPrice(subtotal, currencyCode)}
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full font-mono uppercase tracking-widest group"
              size="lg"
              asChild
            >
              <Link href="/checkout">
                Proceed_To_Checkout
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
