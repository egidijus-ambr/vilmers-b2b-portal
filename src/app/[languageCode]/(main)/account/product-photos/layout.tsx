"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { ProductPhotosProvider } from "@lib/context/product-photos-context"
import ProductPhotosNav from "@modules/account/components/product-photos-nav"

export default function ProductPhotosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { customer } = useCustomer()
  const router = useRouter()

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
    <ProductPhotosProvider>
      <div className="w-full" data-testid="product-photos-layout-wrapper">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Left sidebar navigation - persistent across all product photo pages */}
          <div className="hidden lg:block">
            <ProductPhotosNav />
          </div>

          {/* Main content area - children will be rendered here */}
          <div className="w-full">{children}</div>
        </div>
      </div>
    </ProductPhotosProvider>
  )
}
