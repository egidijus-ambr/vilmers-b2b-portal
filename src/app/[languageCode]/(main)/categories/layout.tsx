"use client"

import { Toaster } from "@medusajs/ui"
import { CatalogBuilderProvider } from "@lib/context/catalog-builder-context"

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CatalogBuilderProvider>
      {children}
      {/* FloatingCatalogBar (mounted deep in this subtree) reports catalogue
          download failures via toast.error() — mount the sink here, same
          pattern as account/layout.tsx, since this route has no other
          Toaster ancestor. */}
      <Toaster />
    </CatalogBuilderProvider>
  )
}
