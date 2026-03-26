import repeat from "@lib/util/repeat"

const SkeletonProductPhotosGrid = () => {
  return (
    <div className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
      {repeat(8).map((i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-white shadow-elevation-card-rest overflow-hidden">
            <div className="aspect-square bg-gold-20" />
            <div className="p-3">
              <div className="h-4 w-3/4 bg-gold-20 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default SkeletonProductPhotosGrid
