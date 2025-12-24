const SkeletonLineItem = () => {
  return (
    <div className="flex bg-gray-50 sm:h-[172px]">
      <div className="h-[92px] w-[92px] shrink-0 animate-pulse bg-gray-100 sm:h-full sm:w-[146px]" />
      <div className="flex w-full justify-between p-5">
        <div className="flex h-full flex-col gap-3 sm:justify-between sm:gap-0">
          <div>
            <div className="mb-2 h-11 w-[100px] animate-pulse bg-gray-100 sm:h-[22px] sm:w-[200px]" />
            <div className="h-[22px] w-10 animate-pulse bg-gray-100" />
          </div>
          <div className="h-12 w-24 animate-pulse bg-gray-100" />
        </div>
        <div className="flex flex-col items-end justify-between">
          <div className="h-12 w-12 animate-pulse bg-gray-100" />
          <div className="h-12 w-24 animate-pulse bg-gray-100" />
        </div>
      </div>
    </div>
  )
}

export default SkeletonLineItem
