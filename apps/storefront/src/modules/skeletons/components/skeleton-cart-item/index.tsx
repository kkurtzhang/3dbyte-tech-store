const SkeletonCartItem = () => {
  return (
    <div className="flex animate-pulse bg-skeleton-primary small:h-[172px]">
      <div className="h-[92px] w-[92px] shrink-0 animate-pulse bg-skeleton-secondary small:h-full small:w-[146px]" />
      <div className="flex w-full justify-between p-5">
        <div className="flex h-full flex-col gap-3 small:justify-between small:gap-0">
          <div>
            <div className="mb-2 h-11 w-[100px] animate-pulse bg-skeleton-secondary small:h-[22px] small:w-[200px]" />
            <div className="h-[22px] w-10 animate-pulse bg-skeleton-secondary" />
          </div>
          <div className="h-12 w-24 animate-pulse bg-skeleton-secondary" />
        </div>
        <div className="flex flex-col items-end justify-between">
          <div className="h-12 w-12 animate-pulse bg-skeleton-secondary" />
          <div className="h-12 w-24 animate-pulse bg-skeleton-secondary" />
        </div>
      </div>
    </div>
  )
}

export default SkeletonCartItem
