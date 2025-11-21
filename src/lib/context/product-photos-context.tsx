"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { sdk } from "@lib/config"
import { ProductSummary } from "@lib/furnisystems-sdk/modules/product-photos/types"

interface ProductPhotosContextType {
  products: ProductSummary[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const ProductPhotosContext = createContext<
  ProductPhotosContextType | undefined
>(undefined)

export function ProductPhotosProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await sdk.productPhotos.getProductsSummary()
      setProducts(data.products)
      console.log("ProductPhotosProvider: Fetched products summary:", data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products")
      console.error("ProductPhotosProvider: Error fetching products:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const refetch = async () => {
    await fetchProducts()
  }

  return (
    <ProductPhotosContext.Provider
      value={{
        products,
        loading,
        error,
        refetch,
      }}
    >
      {children}
    </ProductPhotosContext.Provider>
  )
}

export function useProductPhotos() {
  const context = useContext(ProductPhotosContext)
  if (context === undefined) {
    throw new Error(
      "useProductPhotos must be used within a ProductPhotosProvider"
    )
  }
  return context
}
