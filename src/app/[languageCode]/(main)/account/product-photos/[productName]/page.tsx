"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter, useParams, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useTranslations } from "@lib/i18n"
import { useProductPhotos } from "@lib/context/product-photos-context"
import InteriorPhotoGallery from "@modules/products/components/interior-photo-gallery"
import DownloadPhotosButton from "@modules/products/components/download-photos-button"
import { getProductInteriorPhotos } from "@lib/data/product-photos"
import { ProductPhoto } from "@lib/furnisystems-sdk/modules/product-photos/types"
import { notFound } from "next/navigation"

interface ProductPhotoDetailPageProps {}

export default function ProductPhotoDetailPage(): JSX.Element | null {
  const { customer } = useCustomer()
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const { t } = useTranslations("account")
  const { products, loading: productsLoading } = useProductPhotos()

  const productName = params?.productName as string

  const [photos, setPhotos] = useState<ProductPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customer) {
      router.push("/account")
      return
    }
  }, [customer, router])

  useEffect(() => {
    const fetchProductPhotos = async () => {
      if (!productName || !customer || productsLoading) return

      try {
        setLoading(true)
        setError(null)

        // Decode URL-encoded product name
        const decodedProductName = decodeURIComponent(productName)

        // Check if product exists in our products list
        const productExists = products.some(
          (product) => product.name === decodedProductName
        )

        if (!productExists && !productsLoading) {
          // Product doesn't exist in our list
          notFound()
          return
        }

        const interiorPhotos = await getProductInteriorPhotos(
          decodedProductName
        )
        setPhotos(interiorPhotos)

        // If no photos found, this might be an invalid product
        if (interiorPhotos.length === 0) {
          setError(`No interior photos found for "${decodedProductName}"`)
        }
      } catch (err) {
        console.error("Error fetching product photos:", err)
        setError("Failed to load photos for this product")

        // If error suggests product doesn't exist, show 404
        if (err instanceof Error && err.message.includes("not found")) {
          notFound()
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProductPhotos()
  }, [productName, customer, products, productsLoading])

  const handleBackToProductsList = () => {
    router.push("/account/product-photos")
  }

  if (!customer) {
    return null // Will redirect
  }

  if (!productName) {
    notFound()
  }

  const decodedProductName = decodeURIComponent(productName)

  return (
    <div className="w-full" data-testid="product-photo-detail-page-wrapper">
      {/* Main content - navigation is now handled by layout */}
      <div className="w-full">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl-semi">{decodedProductName}</h1>
          </div>
          {!loading && !error && photos.length > 0 && (
            <DownloadPhotosButton
              productName={decodedProductName}
              photoCount={photos.length}
              disabled={loading}
            />
          )}
        </div>

        <div className="flex flex-col gap-y-8 w-full">
          {loading && (
            <div className="text-center p-8">
              <p className="text-ui-fg-subtle mt-4">Loading photos...</p>
            </div>
          )}

          {error && (
            <div className="text-center p-8 bg-red-50 border border-red-200 text-red-700 ">
              <p className="font-medium mb-2">Unable to load photos</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && photos.length > 0 && (
            <div>
              <InteriorPhotoGallery
                photos={photos}
                productName={decodedProductName}
              />
            </div>
          )}

          {!loading && !error && photos.length === 0 && (
            <div className="text-center p-8 bg-ui-bg-subtle border border-ui-border-base">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-ui-fg-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-ui-fg-base mb-2">
                No Photos Available
              </h3>
              <p className="text-ui-fg-muted mb-4">
                No interior photos are currently available for "
                {decodedProductName}".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
