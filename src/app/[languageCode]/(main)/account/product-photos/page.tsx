"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useTranslations } from "@lib/i18n"
import ProductPhotosNav from "@modules/account/components/product-photos-nav"
import InteriorPhotoGallery from "@modules/products/components/interior-photo-gallery"
import { getProductInteriorPhotos } from "@lib/data/product-photos"
import { sdk } from "@lib/config"
import {
  ProductPhoto,
  ProductSummary,
} from "@lib/furnisystems-sdk/modules/product-photos/types"
import { Button } from "@medusajs/ui"

export default function ProductPhotosPage() {
  const { customer } = useCustomer()
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslations("account")

  const [products, setProducts] = useState<ProductSummary[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [photos, setPhotos] = useState<ProductPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customer) {
      router.push("/account")
      return
    }
  }, [customer, router])

  useEffect(() => {
    // Fetch products list on component mount
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const response = await sdk.productPhotos.getProductsSummary()
        // Filter to only show products that have interior photos
        const productsWithInteriorPhotos = response.products.filter(
          (product) => product.interiorPhotos && product.interiorPhotos > 0
        )
        setProducts(productsWithInteriorPhotos)
      } catch (err) {
        setError("Failed to load products")
        console.error("Error fetching products:", err)
      } finally {
        setLoading(false)
      }
    }

    if (customer) {
      fetchProducts()
    }
  }, [customer])

  const handleProductSelect = async (productName: string) => {
    try {
      setLoading(true)
      setError(null)
      const interiorPhotos = await getProductInteriorPhotos(productName)
      setPhotos(interiorPhotos)
      setSelectedProduct(productName)
    } catch (err) {
      setError("Failed to load photos for this product")
      console.error("Error fetching product photos:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToProductsList = () => {
    setSelectedProduct(null)
    setPhotos([])
    setError(null)
  }

  if (!customer) {
    return null // Will redirect
  }

  return (
    <div className="w-full" data-testid="product-photos-page-wrapper">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Left sidebar navigation */}
        <div className="hidden lg:block">
          <ProductPhotosNav currentPath={pathname} />
        </div>

        {/* Main content */}
        <div className="w-full">
          <div className="mb-8 flex flex-col gap-y-4">
            <h1 className="text-2xl-semi">Product Photos</h1>
            <p className="text-base-regular">
              Browse interior photos of our products.
            </p>
          </div>

          <div className="flex flex-col gap-y-8 w-full">
            {loading && (
              <div className="text-center p-8">
                <p className="text-ui-fg-subtle">Loading...</p>
              </div>
            )}

            {error && (
              <div className="text-center p-8 bg-red-50 text-red-700 rounded">
                <p>{error}</p>
              </div>
            )}

            {!selectedProduct ? (
              // Products list view
              <div>
                <h2 className="text-xl-semi mb-4">Select a Product</h2>
                {products.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                      <button
                        key={product.name}
                        onClick={() => handleProductSelect(product.name)}
                        className="p-4 border border-ui-border-base rounded hover:border-ui-border-strong transition-colors text-left"
                        disabled={loading}
                      >
                        <h3 className="font-medium text-ui-fg-base mb-2">
                          {product.name}
                        </h3>
                        <p className="text-sm text-ui-fg-subtle mb-1">
                          {product.main_product_category}
                          {product.secondary_category &&
                            ` • ${product.secondary_category}`}
                        </p>
                        <p className="text-xs text-ui-fg-muted">
                          {product.interiorPhotos} interior photo
                          {product.interiorPhotos !== 1 ? "s" : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  !loading && (
                    <div className="text-center p-8 bg-ui-bg-subtle rounded">
                      <p className="text-ui-fg-muted">
                        No products with interior photos found.
                      </p>
                    </div>
                  )
                )}
              </div>
            ) : (
              // Gallery view
              <div>
                <div className="mb-6 flex items-center gap-4">
                  <Button
                    variant="secondary"
                    onClick={handleBackToProductsList}
                    disabled={loading}
                  >
                    ← Back to Products
                  </Button>
                  <h2 className="text-xl-semi">{selectedProduct}</h2>
                </div>

                {photos.length > 0 ? (
                  <InteriorPhotoGallery
                    photos={photos}
                    productName={selectedProduct}
                  />
                ) : (
                  !loading && (
                    <div className="text-center p-8 bg-ui-bg-subtle rounded">
                      <p className="text-ui-fg-muted">
                        No interior photos available for {selectedProduct}.
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
