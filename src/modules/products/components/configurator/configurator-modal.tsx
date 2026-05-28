"use client"

import React from "react"
import ResponsiveDialog from "@modules/common/components/responsive-dialog"
import { ConfiguratorProvider } from "@configurator/context/configurator-context"
import ConfiguratorContent from "./configurator-content"

type ConfiguratorModalProps = {
  isOpen: boolean
  close: () => void
  productContainerId: number
  isAdvancedProduct: boolean
  languageCode: string
  priceListId?: number
  showAllProducts?: boolean
}

const ConfiguratorModal = ({
  isOpen,
  close,
  productContainerId,
  isAdvancedProduct,
  languageCode,
  priceListId = 1,
  showAllProducts = false,
}: ConfiguratorModalProps) => {
  if (!isAdvancedProduct) return null

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={close}
      title="Product Configurator"
      className="bg-gold-10"
      size="full"
      data-testid="configurator-modal"
    >
      <ConfiguratorProvider>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ConfiguratorContent
            productContainerId={productContainerId}
            languageCode={languageCode}
            priceListId={priceListId}
            isOpen={isOpen}
            showAllProducts={showAllProducts}
          />
        </div>
      </ConfiguratorProvider>
    </ResponsiveDialog>
  )
}

export default ConfiguratorModal
