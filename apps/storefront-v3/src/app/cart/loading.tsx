import { CartPageSkeleton } from "@/components/loading/storefront-page-skeletons"

export default function CartLoading() {
  return (
    <div className="container py-8 md:py-12">
      <CartPageSkeleton />
    </div>
  )
}
