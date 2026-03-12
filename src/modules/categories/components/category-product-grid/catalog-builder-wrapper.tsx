"use client"

import CatalogBuilderToolbar from "@modules/categories/components/catalog-builder/toolbar"
import FloatingCatalogBar from "@modules/categories/components/catalog-builder/floating-catalog-bar"
import PageProductNamesSync from "@modules/categories/components/catalog-builder/page-product-names-sync"

interface CatalogBuilderWrapperProps {
  productNames: string[]
  filterKey: string
  children: React.ReactNode
}

export default function CatalogBuilderWrapper({
  productNames,
  filterKey,
  children,
}: CatalogBuilderWrapperProps) {
  return (
    <>
      <PageProductNamesSync
        productNames={productNames}
        filterKey={filterKey}
      />
      <div className="flex items-center mb-4">
        <CatalogBuilderToolbar />
      </div>
      {children}
      <FloatingCatalogBar />
    </>
  )
}
