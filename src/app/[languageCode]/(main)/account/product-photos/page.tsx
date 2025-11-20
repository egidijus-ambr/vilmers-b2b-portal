"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { useTranslations } from "@lib/i18n"
import ProductPhotosNav from "@modules/account/components/product-photos-nav"

export default function ProductPhotosPage() {
  const { customer } = useCustomer()
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslations("account")

  useEffect(() => {
    if (!customer) {
      router.push("/account")
      return
    }
  }, [customer, router])

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
              Browse and manage product photos. This feature is coming soon.
            </p>
          </div>
          <div className="flex flex-col gap-y-8 w-full">
            <div className="w-full p-8 bg-gray-50 text-center">
              <h2 className="text-xl-semi mb-4">Coming Soon</h2>
              <p className="text-base-regular text-ui-fg-subtle">
                Product photo management functionality will be available soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
