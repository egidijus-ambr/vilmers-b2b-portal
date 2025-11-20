"use client"

import { useRouter, useParams } from "next/navigation"
import { useTranslations } from "@lib/i18n"
import { useState, useEffect } from "react"
import { sdk } from "@lib/config"
import { ProductSummary } from "@lib/furnisystems-sdk"

interface ProductPhotosNavProps {
  currentPath?: string
}

const ProductPhotosNav = ({ currentPath }: ProductPhotosNavProps) => {
  const router = useRouter()
  const params = useParams()
  const { t } = useTranslations("account")
  const languageCode = params.languageCode as string
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await sdk.productPhotos.getProductsSummary()
        setProducts(data.products)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch products"
        )
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const handleProductClick = (productName: string) => {
    router.push(`/${languageCode}/account/product-photos/${productName}`)
  }

  if (loading) {
    return (
      <div className="bg-white shadow-lg p-4 h-fit min-w-[240px]">
        <div className="text-center py-8">
          <div className="text-base-regular text-gray-500">
            Loading products...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white shadow-lg p-4 h-fit min-w-[240px]">
        <div className="text-center py-8">
          <div className="text-base-regular text-red-500">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-lg p-4 h-fit min-w-[240px]">
      <div className="mb-4 pb-2 border-b border-gray-200">
        <h3 className="text-base-semi text-gray-900">Products</h3>
        <p className="text-sm-regular text-gray-500">{products.length} items</p>
      </div>
      <nav className="space-y-1 max-h-96 overflow-y-auto">
        {products.map((product) => {
          const isActive = currentPath?.includes(product.name)

          return (
            <button
              key={product.name}
              onClick={() => handleProductClick(product.name)}
              className={`w-full text-left px-3 py-2 transition-colors ${
                isActive
                  ? "bg-blue-50 border-l-4 border-blue-500 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div className="flex flex-col">
                <span className="text-base-regular">{product.name}</span>
                <span className="text-xs-regular text-gray-400">
                  {product.productPhotos + product.interiorPhotos} photos
                </span>
              </div>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default ProductPhotosNav
