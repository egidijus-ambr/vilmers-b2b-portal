"use client"

import React, { useState } from "react"
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
  priceListId?: number
  showAllProducts?: boolean
  handle: string
}

const ConfiguratorButton = ({
  productContainerId,
  isAdvancedProduct,
  languageCode,
  priceListId = 1,
  showAllProducts = false,
  handle,
}: ConfiguratorButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { customer } = useCustomer()

  if (!isAdvancedProduct || !customer) return null

  if (features.configurator) {
    return (
      <Link
        href={`/${languageCode}/products/${handle}/configurator`}
        className="inline-flex items-center px-8 py-3 text-sm font-medium rounded-full border border-dark-blue bg-dark-blue text-white hover:opacity-90 transition-all"
        data-testid="configurator-button"
      >
        Product configurator
      </Link>
    )
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        data-testid="configurator-button"
      >
        Product configurator
      </Button>

      {isOpen && (
        <ConfiguratorModal
          isOpen={isOpen}
          close={() => setIsOpen(false)}
          productContainerId={productContainerId}
          isAdvancedProduct={isAdvancedProduct}
          languageCode={languageCode}
          priceListId={priceListId}
          showAllProducts={showAllProducts}
        />
      )}
    </>
  )
}

export default ConfiguratorButton
