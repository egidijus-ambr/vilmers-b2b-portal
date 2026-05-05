"use client"

import FloatingCatalogBar from "@modules/categories/components/catalog-builder/floating-catalog-bar"
import PageProductNamesSync from "@modules/categories/components/catalog-builder/page-product-names-sync"
import type { ProductRef } from "@lib/context/catalog-builder-context"

interface CatalogBuilderWrapperProps {
  products: ProductRef[]
  filterKey: string
  children: React.ReactNode
}

export default function CatalogBuilderWrapper({
  products,
  filterKey,
  children,
}: CatalogBuilderWrapperProps) {
  return (
    <>
      <PageProductNamesSync products={products} filterKey={filterKey} />
      {children}
      <FloatingCatalogBar />
    </>
  )
}
