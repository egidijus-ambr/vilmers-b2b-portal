"use client"

import { useRouter, useParams, usePathname } from "next/navigation"
import { useState, useMemo } from "react"
import { useTranslations } from "@lib/i18n"
import { useProductPhotos } from "@lib/context/product-photos-context"
import { ProductSummary } from "@lib/furnisystems-sdk/modules/product-photos/types"

interface ProductPhotosNavProps {
  currentPath?: string
}

const isNewPhoto = (dateStr?: string | null): boolean => {
  if (!dateStr) return false
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return new Date(dateStr) > thirtyDaysAgo
}

const ProductPhotosNav = ({ currentPath }: ProductPhotosNavProps) => {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const { t } = useTranslations("account")
  const languageCode = params.languageCode as string
  const { products, loading, error } = useProductPhotos()
  const [searchQuery, setSearchQuery] = useState("")

  // Use currentPath prop or fallback to pathname
  const activePath = currentPath || pathname

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.main_product_category
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    )
  }, [products, searchQuery])

  // Helper function to format product name (replace underscores with spaces)
  const formatProductName = (name: string) => {
    return name.replace(/_/g, " ")
  }

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

  // Group filtered products by main category
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const category = product.main_product_category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(product)
    return acc
  }, {} as Record<string, ProductSummary[]>)

  return (
    <div className="bg-white p-4 h-fit min-w-[280px]">
      {/* Search Field */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300  text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <nav className="space-y-3">
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
                    <span className="text-base-regular inline-flex items-center gap-1">
                      {formatProductName(product.name)}
                      {isNewPhoto(product.newest_photo_at) && (
                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block ml-1" />
                      )}
                    </span>
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
