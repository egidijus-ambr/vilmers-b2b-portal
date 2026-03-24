"use client"

import React from "react"
import Modal from "@modules/common/components/modal"
import { ConfiguratorProvider } from "@configurator/context/configurator-context"
import ConfiguratorContent from "./configurator-content"

type ConfiguratorModalProps = {
  isOpen: boolean
  close: () => void
  productContainerId: number
  isAdvancedProduct: boolean
  languageCode: string
  priceListId?: number
}

const ConfiguratorModal = ({
  isOpen,
  close,
  productContainerId,
  isAdvancedProduct,
  languageCode,
  priceListId = 1,
}: ConfiguratorModalProps) => {
  if (!isAdvancedProduct) return null

  return (
    <Modal
      isOpen={isOpen}
      close={close}
      size="fullscreen"
      data-testid="configurator-modal"
    >
      <ConfiguratorProvider>
        <Modal.Title>Product Configurator</Modal.Title>
        <div className="flex-1 overflow-y-auto mt-4">
          <ConfiguratorContent
            productContainerId={productContainerId}
            languageCode={languageCode}
            priceListId={priceListId}
            isOpen={isOpen}
          />
        </div>
      </ConfiguratorProvider>
    </Modal>
  )
}

export default ConfiguratorModal
