import { ProductPageSkeleton } from "@/components/loading/storefront-page-skeletons"

export default function ProductLoading() {
  return (
    <div className="container py-8 md:py-12">
      <ProductPageSkeleton />
    </div>
  )
}
