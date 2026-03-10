"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { sdk } from "@lib/config"
import { CatalogueFile } from "@lib/furnisystems-sdk/modules/product-catalogues/types"

interface CatalogBuilderContextType {
  // Catalog availability (fetched via batch API on mount)
  catalogueMap: Record<string, CatalogueFile[]> // productName → catalogues
  catalogueLoading: boolean

  // Multi-select mode
  selectionMode: boolean
  toggleSelectionMode: () => void
  selectedProducts: Set<string>
  toggleProduct: (name: string) => void
  clearSelection: () => void
}

const CatalogBuilderContext = createContext<
  CatalogBuilderContextType | undefined
>(undefined)

interface CatalogBuilderProviderProps {
  productNames: string[]
  children: React.ReactNode
}

export function CatalogBuilderProvider({
  productNames,
  children,
}: CatalogBuilderProviderProps) {
  const [catalogueMap, setCatalogueMap] = useState<
    Record<string, CatalogueFile[]>
  >({})
  const [catalogueLoading, setCatalogueLoading] = useState(true)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  )

  const namesKey = productNames.join(",")
  useEffect(() => {
    if (productNames.length === 0) {
      setCatalogueMap({})
      setCatalogueLoading(false)
      return
    }

    const fetchCatalogues = async () => {
      try {
        setCatalogueLoading(true)
        const data =
          await sdk.productCatalogues.getBatchProductCatalogues(productNames)
        const map: Record<string, CatalogueFile[]> = {}
        for (const [name, entry] of Object.entries(data.products)) {
          map[name] = entry.catalogues
        }
        setCatalogueMap(map)
      } catch (err) {
        console.error(
          "CatalogBuilderProvider: Error fetching batch catalogues:",
          err
        )
      } finally {
        setCatalogueLoading(false)
      }
    }

    fetchCatalogues()
  }, [namesKey])

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedProducts(new Set())
      }
      return !prev
    })
  }

  const toggleProduct = (name: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedProducts(new Set())
  }

  return (
    <CatalogBuilderContext.Provider
      value={{
        catalogueMap,
        catalogueLoading,
        selectionMode,
        toggleSelectionMode,
        selectedProducts,
        toggleProduct,
        clearSelection,
      }}
    >
      {children}
    </CatalogBuilderContext.Provider>
  )
}

export function useCatalogBuilder() {
  return useContext(CatalogBuilderContext)
}

export function useRequiredCatalogBuilder() {
  const context = useContext(CatalogBuilderContext)
  if (context === undefined) {
    throw new Error(
      "useRequiredCatalogBuilder must be used within a CatalogBuilderProvider"
    )
  }
  return context
}
