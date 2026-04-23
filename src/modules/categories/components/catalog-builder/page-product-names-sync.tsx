"use client"

import { useEffect } from "react"
import { useCatalogBuilder } from "@lib/context/catalog-builder-context"

interface PageProductNamesSyncProps {
  productNames: string[]
  filterKey: string
}

/**
 * Bridge between server-rendered product data and the persistent
 * CatalogBuilderProvider. Pushes current-page product names and
 * filter key into the context on every server re-render.
 */
export default function PageProductNamesSync({
  productNames,
  filterKey,
}: PageProductNamesSyncProps) {
  const context = useCatalogBuilder()

  console.log("[pdf-debug] PageProductNamesSync render", {
    productNamesCount: productNames.length,
    productNames,
    filterKey,
    hasContext: !!context,
  })

  useEffect(() => {
    console.log("[pdf-debug] PageProductNamesSync mounted")
  }, [])

  useEffect(() => {
    console.log("[pdf-debug] PageProductNamesSync -> setFilterKey", { filterKey, hasContext: !!context })
    context?.setFilterKey(filterKey)
  }, [filterKey, context])

  useEffect(() => {
    console.log("[pdf-debug] PageProductNamesSync -> setPageProductNames", { productNamesCount: productNames.length, hasContext: !!context })
    context?.setPageProductNames(productNames)
  }, [productNames, context])

  return null
}
