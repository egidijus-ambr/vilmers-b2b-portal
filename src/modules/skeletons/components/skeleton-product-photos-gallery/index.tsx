import repeat from "@lib/util/repeat"

const SkeletonProductPhotosGallery = () => {
  return (
    <div className="animate-pulse">
      <div className="flex flex-wrap gap-2">
        {repeat(6).map((i) => (
          <div key={i} className="w-16 h-16 bg-gold-20 rounded-sm" />
        ))}
      </div>
      <div className="w-full aspect-[4/3] bg-gold-20 rounded mt-2" />
    </div>
  )
}

export default SkeletonProductPhotosGallery
