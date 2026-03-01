import { Metadata } from "next";
import { GiftCardForm } from "@/features/gift-cards/components/gift-card-form";
import { Gift } from "lucide-react";

export const metadata: Metadata = {
  title: "Gift Cards | 3DByte Tech Store",
  description: "Purchase gift cards for friends and family. Perfect for 3D printing enthusiasts.",
};

export default function GiftCardsPage() {
  return (
    <div className="container py-8 md:py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
          <Gift className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Gift Cards
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Give the perfect gift to the 3D printing enthusiast in your life. 
          Gift cards can be redeemed for any products in our store.
        </p>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
        <div className="text-center p-6 rounded-lg bg-muted/50">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">Instant Delivery</h3>
          <p className="text-sm text-muted-foreground">
            Gift cards are delivered immediately via email
          </p>
        </div>
        <div className="text-center p-6 rounded-lg bg-muted/50">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-2">Never Expires</h3>
          <p className="text-sm text-muted-foreground">
            No expiration date - use anytime
          </p>
        </div>
        <div className="text-center p-6 rounded-lg bg-muted/50">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-2">Any Amount</h3>
          <p className="text-sm text-muted-foreground">
            Choose from $25, $50, $100 or custom amounts
          </p>
        </div>
      </div>

      {/* Gift Card Form */}
      <GiftCardForm />
    </div>
  );
}
