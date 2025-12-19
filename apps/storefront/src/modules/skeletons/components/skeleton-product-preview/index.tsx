const SkeletonProductPreview = () => {
  return (
    <div className="flex animate-pulse flex-col">
      <div className="relative h-[290px] small:h-[504px]">
        <div className="bg-150 absolute left-3 top-3 z-10 h-6 w-[100px] bg-skeleton-secondary small:left-5 small:top-5" />

        <div className="h-full w-full bg-skeleton-primary" />

        <div className="absolute bottom-3 right-3 h-12 w-12 rounded-full bg-skeleton-secondary small:bottom-5 small:right-5" />
      </div>
      <div className="flex flex-col gap-3 p-4 small:gap-6 small:p-5">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-4/5 bg-skeleton-primary"></div>
          <div className="h-6 w-1/5 bg-skeleton-primary"></div>
        </div>
      </div>
    </div>
  )
}

export default SkeletonProductPreview
