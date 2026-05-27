"use client"

import { useEffect } from "react"
import {
  useCatalogBuilder,
  type ProductRef,
} from "@lib/context/catalog-builder-context"

interface PageProductNamesSyncProps {
  products: ProductRef[]
  filterKey: string
}

/**
 * Bridge between server-rendered product data and the persistent
 * CatalogBuilderProvider. Pushes current-page products and
 * filter key into the context on every server re-render.
 */
export default function PageProductNamesSync({
  products,
  filterKey,
}: PageProductNamesSyncProps) {
  const context = useCatalogBuilder()
  const setFilterKey = context?.setFilterKey
  const setPageProducts = context?.setPageProducts

  useEffect(() => {
    setFilterKey?.(filterKey)
  }, [filterKey, setFilterKey])

  useEffect(() => {
    setPageProducts?.(products)
  }, [products, setPageProducts])

  return null
}
