import { Container } from '@modules/common/components/container'
import SkeletonProductGrid from '@modules/skeletons/templates/skeleton-product-grid'

export default function Loading() {
  return (
    <Container className="flex flex-col gap-8 !py-8">
      <div className="flex animate-pulse flex-col gap-4">
        <div className="h-[22px] w-[100px] bg-skeleton-primary" />
        <div className="grid w-full grid-cols-1 items-center justify-between gap-2 lg:flex">
          <div className="flex gap-2">
            <div className="hidden h-12 w-[130px] bg-skeleton-primary sm:block" />
            <div className="hidden h-12 w-[130px] bg-skeleton-primary sm:block" />
            <div className="h-12 w-full bg-skeleton-primary sm:w-[100px]" />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden h-6 w-[100px] bg-skeleton-primary sm:block" />
            <div className="hidden h-12 w-[200px] bg-skeleton-primary sm:block" />
          </div>
        </div>
      </div>
      <SkeletonProductGrid />
    </Container>
  )
}
