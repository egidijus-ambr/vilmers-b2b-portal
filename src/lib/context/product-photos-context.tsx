"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { sdk } from "@lib/config"
import { ProductSummary } from "@lib/furnisystems-sdk/modules/product-photos/types"

/** Stable error code; consumers translate it with `account:products-fetch-failed`. */
export const PRODUCT_PHOTOS_FETCH_ERROR = "products-fetch-failed"

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
    } catch (err) {
      setError(PRODUCT_PHOTOS_FETCH_ERROR)
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
