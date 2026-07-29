import React from "react"
import type { BreadcrumbItem } from "@modules/common/components/breadcrumb"
import PageHeader from "@modules/common/components/page-header"
import PageContent from "@modules/common/components/page-content"
import ProductFeatureSection from "@modules/products/components/product-feature-section"
import type { ProductPageFeature } from "@modules/products/components/product-feature-section"
import ProductDownloadsSection from "@modules/products/components/product-downloads-section"
import type { CatalogueFile } from "@lib/furnisystems-sdk/modules/product-catalogues/types"
import ProductImageGallery from "@modules/products/components/product-image-gallery"
import type { ProductImage } from "@modules/products/components/product-image-gallery"
import type { ProductContainer } from "@lib/furnisystems-sdk/modules/products/types"
import LinkedProductsSection from "@modules/products/components/linked-products-section"
import InteriorGallerySection from "@modules/products/components/interior-gallery-section"
import ComfortSection, {
  type ComfortSectionData,
} from "@modules/products/components/comfort-section"
import ConfiguratorButton from "@modules/products/components/configurator/configurator-button"
import ProductContentBlocks from "@modules/products/components/product-content-blocks"
import ProductSection from "@modules/products/components/product-section"
import type { ContentBlockData } from "@modules/home/components/content-block/types"

export type ProductPageData = {
  id: string
  title: string
  description: string | null
  images: ProductImage[]
  productName: string | null
  breadcrumbs: BreadcrumbItem[]
  features: ProductPageFeature[]
  catalogues: CatalogueFile[]
  linkedProductGroups: { type: string; products: ProductContainer[] }[]
  comfortData: ComfortSectionData | null
  contentBlocks: ContentBlockData[]
  languageCode: string
  isAdvancedProduct: boolean
  productContainerId: number
  showAllProducts: boolean
  handle: string
}

type ProductTemplateProps = {
  product: ProductPageData
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({ product }) => {
  return (
    <>
      <PageHeader breadcrumbItems={product.breadcrumbs} />
      <PageContent>
        <ProductSection>
          <div data-testid="product-container">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-2xl sm:text-3xl font-medium text-dark-blue">{product.title}</h1>
              <ConfiguratorButton
                productContainerId={product.productContainerId}
                isAdvancedProduct={product.isAdvancedProduct}
                languageCode={product.languageCode}
                showAllProducts={product.showAllProducts}
                handle={product.handle}
              />
            </div>
            {product.description && (
              <div
                className="text-dark-blue prose prose-sm mb-6 md:w-1/2 prose-headings:font-sans prose-headings:font-medium prose-headings:tracking-normal prose-h1:text-heading-1 small:prose-h1:text-heading-1-lg prose-h2:text-heading-2 small:prose-h2:text-heading-2-lg prose-h3:text-heading-3 prose-h4:text-heading-eyebrow prose-h4:uppercase"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}
          </div>
        </ProductSection>
        <ProductSection>
          <ProductImageGallery
            images={product.images}
            productTitle={product.title}
            productName={product.productName}
            showCategoryFilter={false}
          />
        </ProductSection>
        {product.features.length > 0 && (
          <ProductFeatureSection features={product.features} />
        )}
        {product.catalogues.length > 0 && (
          <ProductDownloadsSection
            catalogues={product.catalogues}
            languageCode={product.languageCode}
          />
        )}
        {product.contentBlocks.length > 0 && (
          <ProductContentBlocks
            blocks={product.contentBlocks}
            languageCode={product.languageCode}
          />
        )}
        {product.comfortData && <ComfortSection data={product.comfortData} />}
      </PageContent>
      <div className="w-full bg-white pt-8 pb-12">
        <PageContent>
          <InteriorGallerySection productName={product.productName} />
          <LinkedProductsSection
            groups={product.linkedProductGroups}
            languageCode={product.languageCode}
          />
        </PageContent>
      </div>
    </>
  )
}

export default ProductTemplate
