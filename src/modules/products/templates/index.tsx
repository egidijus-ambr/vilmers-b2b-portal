import React from "react"
import type { BreadcrumbItem } from "@modules/common/components/breadcrumb"
import PageHeader from "@modules/common/components/page-header"
import PageContent from "@modules/common/components/page-content"
import ProductFeaturesDisplay from "@modules/products/components/product-features-display"
import type { ProductPageFeature } from "@modules/products/components/product-features-display"
import ProductImageGallery from "@modules/products/components/product-image-gallery"
import type { ProductImage } from "@modules/products/components/product-image-gallery"
import type { ProductContainer } from "@lib/furnisystems-sdk/modules/products/types"
import LinkedProductsSection from "@modules/products/components/linked-products-section"

export type ProductPageData = {
  id: string
  title: string
  description: string | null
  images: ProductImage[]
  productName: string | null
  breadcrumbs: BreadcrumbItem[]
  features: ProductPageFeature[]
  linkedProductGroups: { type: string; products: ProductContainer[] }[]
  languageCode: string
}

type ProductTemplateProps = {
  product: ProductPageData
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({ product }) => {
  return (
    <>
      <PageHeader breadcrumbItems={product.breadcrumbs} />
      <PageContent>
        <div data-testid="product-container">
          <h1 className="page-title mb-4">{product.title}</h1>
          {product.description && (
            <div
              className="text-dark-blue prose prose-sm mb-6 md:w-1/2"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          )}
          <div className="mb-8">
            <ProductImageGallery
              images={product.images}
              productTitle={product.title}
              productName={product.productName}
            />
          </div>
          <ProductFeaturesDisplay features={product.features} />
          <LinkedProductsSection
            groups={product.linkedProductGroups}
            languageCode={product.languageCode}
          />
        </div>
      </PageContent>
    </>
  )
}

export default ProductTemplate
