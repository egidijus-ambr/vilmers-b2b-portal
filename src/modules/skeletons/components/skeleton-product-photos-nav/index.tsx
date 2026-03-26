const widths = ["w-3/4", "w-1/2", "w-2/3", "w-3/5"]

const navGroups = [
  { rows: 3 },
  { rows: 4 },
  { rows: 2 },
]

const SkeletonProductPhotosNav = () => {
  return (
    <div className="animate-pulse bg-white p-4 h-fit min-w-[280px]">
      <div className="mb-4">
        <div className="h-[38px] w-full bg-gold-20 rounded" />
      </div>
      <div className="space-y-3">
        {navGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-1">
            <div className="px-2 py-1 bg-gold-20">
              <div className="h-3 w-20 bg-gold-20 rounded" />
            </div>
            {Array.from({ length: group.rows }).map((_, rowIndex) => {
              const widthClass = widths[(groupIndex * group.rows + rowIndex) % widths.length]
              return (
                <div key={rowIndex} className="ml-2 px-3 py-2">
                  <div className={`h-5 bg-gold-20 rounded ${widthClass}`} />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default SkeletonProductPhotosNav
