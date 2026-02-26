import React from "react"

export type ProductPageFeature = {
  name: string
  description: string | null
  imageUrl: string | null
}

type ProductFeaturesDisplayProps = {
  features: ProductPageFeature[]
}

const ProductFeaturesDisplay: React.FC<ProductFeaturesDisplayProps> = ({ features }) => {
  if (!features || features.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2 my-4">
      {features.map((feature, index) => (
        <div
          key={index}
          className="flex flex-col items-center w-20 pb-2"
          title={feature.description || undefined}
        >
          {feature.imageUrl ? (
            <img
              src={feature.imageUrl}
              alt={feature.name}
              className="w-[60px] h-[60px] sm:w-[50px] sm:h-[50px] object-cover mb-1"
            />
          ) : (
            <div className="w-[60px] h-[60px] sm:w-[50px] sm:h-[50px] bg-gray-100 rounded mb-1" />
          )}
          <span className="text-center text-xs font-medium text-dark-blue leading-tight w-full max-w-[80px] break-words hyphens-auto">
            {feature.name}
          </span>
        </div>
      ))}
    </div>
  )
}

export default ProductFeaturesDisplay
