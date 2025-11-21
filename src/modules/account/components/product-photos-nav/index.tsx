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
        console.log("Fetched products summary:", data)
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
      <div className="bg-white p-4 h-fit min-w-[240px]">
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
      <div className="bg-white p-4 h-fit min-w-[240px]">
        <div className="text-center py-8">
          <div className="text-base-regular text-red-500">Error: {error}</div>
        </div>
      </div>
    )
  }

  // Group products by main category
  const groupedProducts = products.reduce((acc, product) => {
    const category = product.main_product_category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(product)
    return acc
  }, {} as Record<string, ProductSummary[]>)

  return (
    <div className="bg-white  p-4 h-fit min-w-[280px]">
      <nav className="space-y-3 max-h-96 overflow-y-auto">
        {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
          <div key={category} className="space-y-1">
            <div className="px-2 py-1 bg-gray-100">
              <h4 className="text-xs-semi text-gray-700 uppercase tracking-wide">
                {category}
              </h4>
            </div>
            {categoryProducts.map((product) => {
              const isActive = currentPath?.includes(product.name)
              const totalPhotos =
                (product.productPhotos || 0) + (product.interiorPhotos || 0)

              return (
                <button
                  key={product.name}
                  onClick={() => handleProductClick(product.name)}
                  className={`w-full text-left px-3 py-2 ml-2  transition-colors ${
                    isActive
                      ? "bg-blue-50 border-l-4 border-blue-500 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-base-regular">{product.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </div>
  )
}

export default ProductPhotosNav
