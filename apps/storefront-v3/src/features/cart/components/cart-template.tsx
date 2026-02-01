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
      <div className="flex flex-col items-center justify-center space-y-6 py-20 text-center">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-primary/10 blur-xl" />
          <ShoppingCart className="relative h-16 w-16 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Inventory Empty</h2>
          <p className="text-muted-foreground max-w-[300px] mx-auto">
            Your system inventory is currently empty. Add components to proceed
            with acquisition.
          </p>
        </div>
        <Button asChild className="font-mono uppercase tracking-widest">
          <Link href="/shop">Browse_Catalog</Link>
        </Button>
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
