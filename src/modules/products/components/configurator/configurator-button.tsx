"use client"

import React, { useState } from "react"
import { useTranslations } from "@lib/i18n"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useCustomer } from "@lib/context/customer-context"
import Button from "@modules/common/components/button"
import { features } from "@lib/features"

// Lazy-load the configurator modal to avoid loading Konva etc. on initial page load
const ConfiguratorModal = dynamic(() => import("./configurator-modal"), {
  ssr: false,
})

type ConfiguratorButtonProps = {
  productContainerId: number
  isAdvancedProduct: boolean
  languageCode: string
  showAllProducts?: boolean
  handle: string
}

const ConfiguratorButton = ({
  productContainerId,
  isAdvancedProduct,
  languageCode,
  showAllProducts = false,
  handle,
}: ConfiguratorButtonProps) => {
  const { t: tc } = useTranslations("common")
  const [isOpen, setIsOpen] = useState(false)
  const { customer } = useCustomer()

  if (!isAdvancedProduct || !customer) return null

  if (features.configurator) {
    return (
      <Link
        href={`/${languageCode}/products/${handle}/configurator`}
        className="inline-flex items-center px-8 py-3 text-sm font-medium rounded-button border border-dark-blue bg-dark-blue text-white hover:opacity-90 transition-all"
        data-testid="configurator-button"
      >
        {tc("product-configurator")}
      </Link>
    )
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        data-testid="configurator-button"
      >
        {tc("product-configurator")}
      </Button>

      {isOpen && (
        <ConfiguratorModal
          isOpen={isOpen}
          close={() => setIsOpen(false)}
          productContainerId={productContainerId}
          isAdvancedProduct={isAdvancedProduct}
          languageCode={languageCode}
          showAllProducts={showAllProducts}
        />
      )}
    </>
  )
}

export default ConfiguratorButton
