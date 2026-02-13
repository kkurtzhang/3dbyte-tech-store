"use client";

import { useState, useEffect } from "react";
import { sdk } from "@/lib/medusa/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/context/cart-context";
import { useRouter } from "next/navigation";
import { Gift, CreditCard, Mail, MessageSquare, Loader2 } from "lucide-react";

interface GiftCardVariant {
  id: string;
  title: string;
  prices?: Array<{ amount: number; currency_code: string }>;
}

interface GiftCardProduct {
  id: string;
  title: string;
  handle?: string;
  is_giftcard?: boolean;
  variants?: GiftCardVariant[];
}

const DENOMINATIONS = [
  { value: 2500, label: "$25" },
  { value: 5000, label: "$50" },
  { value: 10000, label: "$100" },
];

export function GiftCardForm() {
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [giftCardProducts, setGiftCardProducts] = useState<GiftCardProduct[]>([]);
  const { addItem, cart } = useCart();
  const router = useRouter();

  useEffect(() => {
    async function fetchGiftCards() {
      try {
        // Try to fetch gift card products from Medusa
        const response = await sdk.store.product.list({
          limit: 10,
          fields: "*variants,*variants.prices",
        });
        
        // Filter for gift card products (if is_giftcard is available in response)
        const giftCards = (response.products || []).filter(
          (p: any) => p.is_giftcard === true
        ) as GiftCardProduct[];
        
        setGiftCardProducts(giftCards);
      } catch (err) {
        console.warn("Failed to fetch gift cards from Medusa:", err);
        // Fall back to default denominations
      }
    }
    
    fetchGiftCards();
  }, []);

  const amount = selectedDenomination 
    ? selectedDenomination 
    : (customAmount ? Math.round(parseFloat(customAmount) * 100) : 0);

  const isValidAmount = amount >= 500 && amount <= 500000; // $5 to $5000

  const handleAddToCart = async () => {
    if (!isValidAmount) {
      setError("Please select or enter a valid amount ($5 - $5000)");
      return;
    }

    if (!recipientEmail) {
      setError("Please enter a recipient email");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Store gift card metadata in localStorage for later processing
      const giftCardData = {
        amount,
        recipientEmail,
        recipientName,
        message,
        type: "purchase",
      };
      
      // Save to localStorage for order processing
      localStorage.setItem("pendingGiftCard", JSON.stringify(giftCardData));
      
      // Try to find a gift card product to add to cart
      // In production, you'd have specific gift card variants for each denomination
      if (giftCardProducts.length > 0) {
        // Add the first gift card product's first variant to cart
        const giftCardProduct = giftCardProducts[0];
        const variantId = giftCardProduct.variants?.[0]?.id;
        
        if (variantId) {
          await addItem(variantId, 1);
        }
      }
      
      // For demo purposes, we'll redirect even without a product
      // The gift card data is saved in localStorage for backend processing
      router.push("/cart?giftcard=added");
    } catch (err: any) {
      setError(err.message || "Failed to add gift card to cart");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left Column - Denomination Selection */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Select Amount
            </CardTitle>
            <CardDescription>
              Choose a gift card denomination or enter a custom amount
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pre-defined denominations */}
            <div className="grid grid-cols-3 gap-3">
              {DENOMINATIONS.map((denom) => (
                <button
                  key={denom.value}
                  type="button"
                  onClick={() => {
                    setSelectedDenomination(denom.value);
                    setCustomAmount("");
                  }}
                  className={`p-4 rounded-lg border-2 transition-all font-semibold text-lg
                    ${selectedDenomination === denom.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                >
                  {denom.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px bg-border flex-1" />
              <span className="text-sm text-muted-foreground">or</span>
              <div className="h-px bg-border flex-1" />
            </div>

            {/* Custom amount */}
            <div className="space-y-2">
              <Label htmlFor="custom-amount">Custom Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="custom-amount"
                  type="number"
                  min="5"
                  max="5000"
                  step="1"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedDenomination(null);
                  }}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum $5, Maximum $5,000</p>
            </div>

            {/* Selected amount display */}
            {amount > 0 && isValidAmount && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-center">
                  <span className="text-sm text-muted-foreground">Gift Card Value: </span>
                  <span className="text-2xl font-bold text-primary">
                    ${(amount / 100).toFixed(2)}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gift Card Preview */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-6 text-primary-foreground">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Gift className="h-6 w-6" />
                <span className="font-bold text-xl tracking-wider">GIFT CARD</span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">
                  ${amount > 0 && isValidAmount ? (amount / 100).toFixed(2) : "0.00"}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-between items-end">
              <div>
                <p className="text-xs opacity-75">TO</p>
                <p className="font-medium">{recipientName || "Recipient Name"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-75">FROM</p>
                <p className="font-medium">You</p>
              </div>
            </div>
          </div>
          {message && (
            <CardContent className="pt-4 border-t">
              <p className="text-sm text-muted-foreground italic">"{message}"</p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Right Column - Recipient Details */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Recipient Details
            </CardTitle>
            <CardDescription>
              Enter the email and name of who will receive this gift card
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-name">Recipient Name</Label>
              <Input
                id="recipient-name"
                type="text"
                placeholder="John Doe"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-email">
                Recipient Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="recipient@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                Personal Message <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="message"
                placeholder="Add a personal message to your gift card..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/500
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gift Card Value</span>
              <span className="font-medium">
                ${amount > 0 ? (amount / 100).toFixed(2) : "$0.00"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processing Fee</span>
              <span className="text-muted-foreground">$0.00</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-xl">
                ${amount > 0 ? (amount / 100).toFixed(2) : "$0.00"}
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              size="lg"
              onClick={handleAddToCart}
              disabled={!isValidAmount || !recipientEmail || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding to Cart...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Add to Cart
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Gift cards will be delivered via email immediately after purchase.
          The recipient can use the code at checkout.
        </p>
      </div>
    </div>
  );
}
