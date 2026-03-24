"use client"

import React, { useState } from "react"
import dynamic from "next/dynamic"

// Lazy-load the configurator modal to avoid loading Konva etc. on initial page load
const ConfiguratorModal = dynamic(() => import("./configurator-modal"), {
  ssr: false,
})

type ConfiguratorButtonProps = {
  productContainerId: number
  isAdvancedProduct: boolean
  languageCode: string
  priceListId?: number
}

const ConfiguratorButton = ({
  productContainerId,
  isAdvancedProduct,
  languageCode,
  priceListId = 1,
}: ConfiguratorButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!isAdvancedProduct) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[#1e2a3a] text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-[#2a3a4a] transition-colors"
        data-testid="configurator-button"
      >
        Product configurator
      </button>

      {isOpen && (
        <ConfiguratorModal
          isOpen={isOpen}
          close={() => setIsOpen(false)}
          productContainerId={productContainerId}
          isAdvancedProduct={isAdvancedProduct}
          languageCode={languageCode}
          priceListId={priceListId}
        />
      )}
    </>
  )
}

export default ConfiguratorButton
