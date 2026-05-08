import React from "react"
import ProductSection from "@modules/products/components/product-section"

export type ProductPageFeature = {
  name: string
  description: string | null
  imageUrl: string | null
}

type ProductFeatureSectionProps = {
  features: ProductPageFeature[]
}

const ProductFeatureSection: React.FC<ProductFeatureSectionProps> = ({
  features,
}) => {
  if (!features || features.length === 0) {
    return null
  }

  return (
    <ProductSection title="Features" divider>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <div key={index} className="flex flex-row items-start gap-4">
            <div className="w-[60px] h-[60px] flex-shrink-0 overflow-hidden ">
              {feature.imageUrl ? (
                <img
                  src={feature.imageUrl}
                  alt={feature.name}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <div>
              <span className="block font-bold text-dark-blue text-sm leading-tight mb-1">
                {feature.name}
              </span>
              {feature.description && (
                <span className="block text-sm text-dark-blue leading-6">
                  {feature.description}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </ProductSection>
  )
}

export default ProductFeatureSection
