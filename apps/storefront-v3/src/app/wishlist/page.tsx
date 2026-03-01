import { Metadata } from "next"
import { redirect } from "next/navigation"
import { WishlistClient } from "./wishlist-client"

export const metadata: Metadata = {
  title: "Wishlist | 3D Byte Store",
  description: "Your saved products and favorites",
}

export default function WishlistPage() {
  // Wishlist is client-side only, so we redirect to the client component
  return <WishlistClient />
}
