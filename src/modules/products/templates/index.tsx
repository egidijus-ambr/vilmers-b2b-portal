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
import InteriorGallerySection from "@modules/products/components/interior-gallery-section"
import ComfortSection, { type ComfortSectionData } from "@modules/products/components/comfort-section"

export type ProductPageData = {
  id: string
  title: string
  description: string | null
  images: ProductImage[]
  productName: string | null
  breadcrumbs: BreadcrumbItem[]
  features: ProductPageFeature[]
  linkedProductGroups: { type: string; products: ProductContainer[] }[]
  comfortData: ComfortSectionData | null
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
              showCategoryFilter={false}
              alwaysExpanded={true}
              showPanelHeader={false}
            />
          </div>
          <hr className="border-t border-gray-300 mb-4" />
          <ProductFeaturesDisplay features={product.features} />
          {product.comfortData && (
            <>
              <hr className="border-t border-gray-300 mt-8 mb-4" />
              <ComfortSection data={product.comfortData} />
            </>
          )}
          <hr className="border-t border-gray-300 mt-8" />
          <InteriorGallerySection productName={product.productName} />
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
