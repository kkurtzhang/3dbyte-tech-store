const SkeletonPostTile = () => {
  return (
    <div className="flex animate-pulse flex-col">
      <div className="relative h-[224px] sm:h-[280px]">
        <div className="h-full w-full bg-skeleton-primary" />
      </div>
      <div className="flex flex-col gap-3 p-4 sm:gap-6 sm:p-5">
        <div className="flex flex-col items-start gap-4">
          <div className="h-6 w-2/5 bg-skeleton-primary"></div>
          <div className="h-6 w-4/5 bg-skeleton-primary"></div>
        </div>
      </div>
    </div>
  )
}

export default SkeletonPostTile
