import React from "react"
import type { BreadcrumbItem } from "@modules/common/components/breadcrumb"
import PageHeader from "@modules/common/components/page-header"
import PageContent from "@modules/common/components/page-content"
import ProductFeaturesDisplay from "@modules/products/components/product-features-display"
import type { ProductPageFeature } from "@modules/products/components/product-features-display"
import ProductImageGallery from "@modules/products/components/product-image-gallery"
import type { ProductImage } from "@modules/products/components/product-image-gallery"

export type ProductPageData = {
  id: string
  title: string
  description: string | null
  images: ProductImage[]
  productName: string | null
  breadcrumbs: BreadcrumbItem[]
  features: ProductPageFeature[]
}

type ProductTemplateProps = {
  product: ProductPageData
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({ product }) => {
  return (
    <>
      <PageHeader breadcrumbItems={product.breadcrumbs} />
      <PageContent>
        <div
          data-testid="product-container"
          className="flex flex-col md:flex-row gap-8 mb-8"
        >
          <div className="md:w-3/5">
            <ProductImageGallery
              images={product.images}
              productTitle={product.title}
              productName={product.productName}
            />
          </div>
          <div className="md:w-2/5">
            <h1 className="page-title mb-6">{product.title}</h1>
            {product.description && (
              <div
                className="text-dark-blue prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}
            <ProductFeaturesDisplay features={product.features} />
          </div>
        </div>
      </PageContent>
    </>
  )
}

export default ProductTemplate
