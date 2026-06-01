"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCustomer } from "@lib/context/customer-context"
import { ConfiguratorProvider } from "@configurator/context/configurator-context"
import ConfiguratorContent from "@modules/products/components/configurator/configurator-content"

type ConfiguratorPageClientProps = {
  productContainerId: number
  languageCode: string
  priceListId: number
  showAllProducts: boolean
  handle: string
}

const ConfiguratorPageClient = ({
  productContainerId,
  languageCode,
  priceListId,
  showAllProducts,
  handle,
}: ConfiguratorPageClientProps) => {
  const { customer } = useCustomer()
  const router = useRouter()

  useEffect(() => {
    if (!customer) {
      router.replace(`/${languageCode}/products/${handle}`)
    }
  }, [customer, languageCode, handle, router])

  if (!customer) {
    return null
  }

  return (
    <div className="flex flex-col min-h-[80vh]">
      <ConfiguratorProvider>
        <ConfiguratorContent
          productContainerId={productContainerId}
          languageCode={languageCode}
          priceListId={priceListId}
          isOpen={true}
          showAllProducts={showAllProducts}
          embedded={true}
        />
      </ConfiguratorProvider>
    </div>
  )
}

export default ConfiguratorPageClient
