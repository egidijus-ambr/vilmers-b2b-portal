"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useTranslations } from "@lib/i18n"
import { useProductPhotos } from "@lib/context/product-photos-context"
import Image from "next/image"
import Link from "next/link"

export default function ProductPhotosPage() {
  const { customer } = useCustomer()
  const router = useRouter()
  const { t } = useTranslations("account")
  const {
    products,
    loading: productsLoading,
    error: productsError,
  } = useProductPhotos()

  useEffect(() => {
    if (!customer) {
      router.push("/account")
      return
    }
  }, [customer, router])

  // Filter products to only show those that have interior photos with thumbnail
  const productsWithPhotos = products.filter(
    (product) => product.first_interior_photo_url
  )

  if (!customer) {
    return null // Will redirect
  }

  return (
    <div className="w-full " data-testid="product-photos-page-wrapper">
      <div className="w-full mt-6">
        <div className="mb-4 flex flex-col gap-y-2">
          <h1 className="text-2xl-semi">Product Photos</h1>
        </div>

        <div className="flex flex-col gap-y-8 w-full">
          {productsLoading && (
            <div className="text-center p-8">
              <p className="text-ui-fg-subtle">Loading products...</p>
            </div>
          )}

          {productsError && (
            <div className="text-center p-8 bg-red-50 text-red-700 ">
              <p>{productsError}</p>
            </div>
          )}

          {!productsLoading && (
            <div>
              {productsWithPhotos.length > 0 ? (
                <div className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
                  {productsWithPhotos.map((product) => (
                    <Link
                      key={product.name}
                      href={`/account/product-photos/${encodeURIComponent(
                        product.name
                      )}`}
                      className="group block"
                    >
                      <div className="bg-white shadow-elevation-card-rest  overflow-hidden hover:shadow-elevation-card-hover transition-shadow duration-200">
                        <div className="relative aspect-square">
                          <Image
                            src={product.first_interior_photo_url!}
                            alt={`${product.name} interior photo`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                          />
                        </div>
                        <div className="p-3">
                          <h3 className="font-medium text-ui-fg-base text-sm line-clamp-2 group-hover:text-ui-fg-interactive transition-colors">
                            {product.name}
                          </h3>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-ui-bg-subtle">
                  <p className="text-ui-fg-muted">
                    No products with interior photos found.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
