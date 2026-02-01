import { Metadata } from "next";
import { CartTemplate } from "@/features/cart/components/cart-template";

export const metadata: Metadata = {
  title: "Shopping Cart",
  description: "View and manage items in your cart.",
};

export default function CartPage() {
  return (
    <div className="container py-8 md:py-12">
      <CartTemplate />
    </div>
  );
}
