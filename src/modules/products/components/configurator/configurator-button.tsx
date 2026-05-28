"use client"

import React, { useState } from "react"
import dynamic from "next/dynamic"
import { useCustomer } from "@lib/context/customer-context"
import Button from "@modules/common/components/button"

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
}

const ConfiguratorButton = ({
  productContainerId,
  isAdvancedProduct,
  languageCode,
  priceListId = 1,
  showAllProducts = false,
}: ConfiguratorButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { customer } = useCustomer()

  if (!isAdvancedProduct || !customer) return null

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
