const SkeletonCartTotals = ({ header = true }) => {
  return (
    <div className="flex flex-col">
      {header && <div className="mb-4 h-4 w-32 bg-skeleton-secondary"></div>}
      <div className="flex items-center justify-between">
        <div className="h-3 w-32 bg-skeleton-secondary"></div>
        <div className="h-3 w-32 bg-skeleton-secondary"></div>
      </div>

      <div className="my-4 flex items-center justify-between">
        <div className="h-3 w-24 bg-skeleton-secondary"></div>
        <div className="h-3 w-24 bg-skeleton-secondary"></div>
      </div>

      <div className="flex items-center justify-between">
        <div className="h-3 w-28 bg-skeleton-secondary"></div>
        <div className="h-3 w-20 bg-skeleton-secondary"></div>
      </div>

      <div className="my-4 w-full border-b border-dashed bg-skeleton-secondary"></div>

      <div className="flex items-center justify-between">
        <div className="mb-4 h-6 w-32 bg-skeleton-secondary"></div>
        <div className="mb-4 h-6 w-24 bg-skeleton-secondary"></div>
      </div>
    </div>
  )
}

export default SkeletonCartTotals
