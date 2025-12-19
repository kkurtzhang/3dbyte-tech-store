const SkeletonCodeForm = () => {
  return (
    <div className="flex w-full animate-pulse flex-col bg-skeleton-primary">
      <div className="grid grid-cols-[1fr_48px] gap-x-2 p-5">
        <div className="h-12 bg-skeleton-secondary"></div>
        <div className="h-12 bg-skeleton-secondary"></div>
      </div>
    </div>
  )
}

export default SkeletonCodeForm
