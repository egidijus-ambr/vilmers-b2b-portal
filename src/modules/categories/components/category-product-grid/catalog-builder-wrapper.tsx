"use client"

import { CatalogBuilderProvider } from "@lib/context/catalog-builder-context"
import CatalogBuilderToolbar from "@modules/categories/components/catalog-builder/toolbar"

interface CatalogBuilderWrapperProps {
  productNames: string[]
  language: string
  children: React.ReactNode
}

export default function CatalogBuilderWrapper({
  productNames,
  language,
  children,
}: CatalogBuilderWrapperProps) {
  return (
    <CatalogBuilderProvider productNames={productNames}>
      <div className="flex items-center mb-4">
        <CatalogBuilderToolbar language={language} />
      </div>
      {children}
    </CatalogBuilderProvider>
  )
}
