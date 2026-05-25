import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSessionAction } from "@/app/actions/auth"
import { WishlistClient } from "./wishlist-client"

export const metadata: Metadata = {
  title: "Wishlist | 3D Byte Store",
  description: "Your saved products and favorites",
}

export default async function WishlistPage() {
  const session = await getSessionAction()
  if (!session.success) {
    redirect("/sign-in")
  }

  return <WishlistClient />
}
