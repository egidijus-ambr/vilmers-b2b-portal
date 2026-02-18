import React from "react"
import Image from "next/image"
import type { BreadcrumbItem } from "@modules/common/components/breadcrumb"
import PageHeader from "@modules/common/components/page-header"

export type ProductPageData = {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  breadcrumbs: BreadcrumbItem[]
}

type ProductTemplateProps = {
  product: ProductPageData
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({ product }) => {
  return (
    <PageHeader breadcrumbItems={product.breadcrumbs}>
      <div data-testid="product-container" className="flex flex-col md:flex-row gap-8">
        <div className="md:w-3/5">
          {product.imageUrl ? (
            <div className="bg-white p-4">
              <Image
                src={product.imageUrl}
                alt={product.title}
                width={800}
                height={800}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
          ) : (
            <div className="w-full aspect-square bg-white flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </div>
        <div className="md:w-2/5">
          <h1 className="text-2xl sm:text-3xl font-medium text-dark-blue mb-4">
            {product.title}
          </h1>
          {product.description && (
            <div
              className="text-dark-blue prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          )}
        </div>
      </div>
    </PageHeader>
  )
}

export default ProductTemplate
