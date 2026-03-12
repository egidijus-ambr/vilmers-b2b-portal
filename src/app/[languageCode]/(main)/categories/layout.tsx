"use client"

import { CatalogBuilderProvider } from "@lib/context/catalog-builder-context"

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <CatalogBuilderProvider>{children}</CatalogBuilderProvider>
}
