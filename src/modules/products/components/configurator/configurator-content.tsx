"use client"

import React from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import { useConfiguratorData } from "@configurator/hooks/use-configurator-data"
import { useConfiguratorPrice } from "@configurator/hooks/use-configurator-price"
import FabricSection from "./fabric-section"
import PriceFooter from "./price-footer"

type ConfiguratorContentProps = {
  productContainerId: number
  languageCode: string
  priceListId: number
  isOpen: boolean
}

const ConfiguratorContent = ({
  productContainerId,
  languageCode,
  priceListId,
  isOpen,
}: ConfiguratorContentProps) => {
  // Load data on-demand when modal opens
  useConfiguratorData(productContainerId, priceListId, languageCode, isOpen)

  // Recalculate price when selections change
  useConfiguratorPrice(priceListId)

  const { state } = useConfigurator()
  const { productData, isLoading, error } = state

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <p className="text-sm text-gray-500">Loading configurator...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-2">Failed to load configurator</p>
          <p className="text-xs text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!productData) {
    return null
  }

  const isSofa = productData.advanced_product?.advanced_product_type === "SOFA"

  return (
    <div className="flex flex-col h-full">
      {/* Main content area — 2 panel layout */}
      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left panel: Shape selection + canvas */}
        <div className="w-full md:w-2/3 overflow-y-auto pr-2">
          {isSofa ? (
            <div className="space-y-4">
              {/* TODO: SofaShapeSection — Phase 4 */}
              <div className="bg-gray-50 rounded-lg p-8 flex items-center justify-center min-h-[400px]">
                <p className="text-gray-400 text-sm">
                  Sofa shape selection will be rendered here
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 flex items-center justify-center min-h-[400px]">
              <p className="text-gray-400 text-sm">
                Product preview
              </p>
            </div>
          )}
        </div>

        {/* Right panel: Fabrics + Components */}
        <div className="w-full md:w-1/3 overflow-y-auto pl-2 space-y-6">
          {/* Fabric selection */}
          <FabricSection languageCode={languageCode} />

          {/* TODO: AdditionalComponentSection — Phase 5 */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">Additional Options</h3>
            <div className="bg-gray-50 rounded p-6 flex items-center justify-center">
              <p className="text-gray-400 text-xs">Component options — Phase 5</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky price footer */}
      <PriceFooter
        currency={productData.manufacturer?.currency ?? "EUR"}
        onAddToCart={() => {
          // TODO: Cart integration — Phase 6
          console.log("Add to cart — to be implemented")
        }}
      />
    </div>
  )
}

export default ConfiguratorContent
