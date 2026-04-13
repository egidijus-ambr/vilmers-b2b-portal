"use client"

import React, { useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { clx } from "@medusajs/ui"
import { useConfigurator } from "@configurator/context/configurator-context"
import { useConfiguratorData } from "@configurator/hooks/use-configurator-data"
import { useConfiguratorPrice } from "@configurator/hooks/use-configurator-price"
import { useDynamicGroups } from "@configurator/hooks/use-dynamic-groups"
import { buildIntegrationConfiguration } from "@/configurator/lib/vilmers"
import { getStepsForProduct } from "@configurator/lib/component-utils"
import { useCustomer } from "@lib/context/customer-context"
import { useCustomerPaletteIds } from "@configurator/lib/palette-utils"
import FabricSection from "./fabric-section"
import ComponentSection from "./component-section"
import ConfiguratorStepper from "./configurator-stepper"
import PriceFooter from "./price-footer"
import ConfigurationSummary from "./configuration-summary"
import ProductPreviewSection from "./product-preview-section"

// Konva requires browser DOM — must be loaded client-only
const SofaShapeSection = dynamic(() => import("./sofa-shape-section"), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-50 p-8 flex items-center justify-center min-h-[400px]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
    </div>
  ),
})

type ConfiguratorContentProps = {
  productContainerId: number
  languageCode: string
  priceListId: number
  isOpen: boolean
}

const ConfiguratorContent = ({
  productContainerId,
  languageCode,
  priceListId: priceListIdProp,
  isOpen,
}: ConfiguratorContentProps) => {
  const { customer } = useCustomer()
  const paletteIds = useCustomerPaletteIds()

  // Use customer's price list instead of hardcoded default
  const priceListId = customer?.price_listId
    ? Number(customer.price_listId)
    : priceListIdProp

  // Load data on-demand when modal opens
  useConfiguratorData(productContainerId, priceListId, languageCode, isOpen)

  // Recalculate price when selections change
  useConfiguratorPrice(priceListId)

  const { state, dispatch } = useConfigurator()
  const { productData, isLoading, error } = state

  // Activate dynamic group computation (armrests, legs, threads)
  useDynamicGroups(state.originalComponentGroups)

  const isSofa = productData?.advanced_product?.advanced_product_type === "SOFA"
  const hasFabricSelection =
    productData?.advanced_product?.advanced_product_type === "SOFA" ||
    productData?.advanced_product?.advanced_product_type === "OTHER_WITH_FABRICS"

  // Compute visible steps
  const steps = useMemo(
    () =>
      getStepsForProduct(
        state.additionalComponentGroups,
        state.selectedAdditionalComponents,
        state.sofaCombinations,
        isSofa,
        hasFabricSelection
      ),
    [state.additionalComponentGroups, state.selectedAdditionalComponents, state.sofaCombinations, isSofa, hasFabricSelection]
  )

  const currentStep = Math.min(state.currentStep, Math.max(steps.length - 1, 0))
  const currentStepDef = steps[currentStep]

  // Sofa modules validation: at least one module must be on canvas
  const hasSofaModules = (state.sofaCombinations?.length ?? 0) > 0 &&
    state.sofaCombinations!.some((group) => group.length > 0)

  const canNavigateToStep = useCallback(
    (index: number) => {
      // If sofa-modules step exists and is incomplete, lock all subsequent steps
      if (steps[0]?.id === "sofa-modules" && !hasSofaModules && index > 0) return false
      return true
    },
    [steps, hasSofaModules]
  )

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
          <p className="text-sm text-red-600 mb-2">
            Failed to load configurator
          </p>
          <p className="text-xs text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!productData) {
    return null
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto md:overflow-hidden">
      {/* Main content area — 2 panel layout */}
      <div className="flex flex-col md:flex-row md:flex-1 gap-6 md:overflow-hidden px-4 md:px-6">
        {/* Left panel: Shape selection + canvas */}
        <div className="w-full md:w-2/3 md:overflow-y-auto md:pr-2 py-6">
          {isSofa ? (
            <SofaShapeSection languageCode={languageCode} />
          ) : (
            <ProductPreviewSection languageCode={languageCode} />
          )}
          <ConfigurationSummary languageCode={languageCode} />
        </div>

        {/* Right panel: Stepper + Step Content */}
        <div className="w-full md:w-1/3 md:overflow-y-auto md:pl-2 space-y-6 pt-6">
          {/* Stepper navigation */}
          {steps.length > 1 && (
            <ConfiguratorStepper
              steps={steps}
              currentStep={currentStep}
              onStepChange={(i) =>
                dispatch({ type: "SET_CURRENT_STEP", payload: i })
              }
              canNavigateToStep={canNavigateToStep}
            />
          )}

          {/* Debug info */}
          <details className="text-[11px] border border-dashed border-gray-300 bg-gray-50/50">
            <summary className="px-3 py-1.5 cursor-pointer text-gray-400 hover:text-gray-600 select-none font-mono">
              Debug Info
            </summary>
            <div className="px-3 pb-2 space-y-1.5 font-mono text-gray-500">
              <div>
                <span className="text-gray-400">Palette IDs:</span>{" "}
                {paletteIds.length > 0 ? paletteIds.join(", ") : <span className="text-red-400">none</span>}
              </div>
              <div>
                <span className="text-gray-400">Customer palettes:</span>{" "}
                {customer?.fabric_palettes?.map(p => p.id).join(", ") || <span className="text-red-400">none</span>}
              </div>
              <div>
                <span className="text-gray-400">Group palettes:</span>{" "}
                {customer?.customer_group?.fabric_palettes?.map(p => p.id).join(", ") || <span className="text-red-400">none</span>}
              </div>
              <div>
                <span className="text-gray-400">Price List ID:</span>{" "}
                {priceListId}
                <span className="text-gray-400 ml-2">(customer: {customer?.price_listId ?? "none"})</span>
              </div>
              <div>
                <span className="text-gray-400">Selected fabric:</span>{" "}
                {state.selectedFabric.fabricGroupObject
                  ? `CAT ${state.selectedFabric.fabricGroupObject.form_price_fabric_category?.group_number}`
                  : <span className="text-red-400">none</span>}
                {state.selectedFabric.fabricObject && (
                  <span className="text-gray-400"> ({state.selectedFabric.fabricObject.code})</span>
                )}
              </div>
              <div>
                <span className="text-gray-400">Components:</span>{" "}
                {state.selectedAdditionalComponents.length > 0
                  ? state.selectedAdditionalComponents.map(c => c.code || c.id).join(", ")
                  : <span className="text-red-400">none</span>}
              </div>
              <div>
                <span className="text-gray-400">Modules:</span>{" "}
                {state.sofaForms.length} total,{" "}
                {state.sofaForms.filter(f => f.form_price_fabric_category?.length > 0).length} with prices for PL {priceListId},{" "}
                {state.sofaForms.filter(f => f.form_price_fabric_category?.length === 0).length} without
              </div>
              <div>
                <span className="text-gray-400">Sofa modules on canvas:</span>{" "}
                {state.sofaCombinations.reduce((sum, group) => sum + group.length, 0)}
              </div>
              <div>
                <span className="text-gray-400">Total price:</span>{" "}
                {state.totalPrice != null ? state.totalPrice : <span className="text-red-400">null</span>}
              </div>
            </div>
          </details>

          {/* Step content */}
          {currentStepDef?.id === "sofa-modules" ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sofa Modules</h3>
              <p className="text-sm text-gray-500">
                Select and arrange sofa modules on the canvas to build your configuration.
              </p>
              {!hasSofaModules && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-sm text-amber-700">
                    Please add at least one sofa module to continue.
                  </p>
                </div>
              )}
            </div>
          ) : currentStepDef?.id === "fabric" ? (
            <FabricSection languageCode={languageCode} />
          ) : currentStepDef ? (
            <ComponentSection
              groups={currentStepDef.groups}
              languageCode={languageCode}
            />
          ) : hasFabricSelection ? (
            <FabricSection languageCode={languageCode} />
          ) : null}

          {/* Step navigation buttons */}
          {steps.length > 1 && (
            <div className="flex justify-between pt-2">
              {currentStep > 0 ? (
                <button
                  onClick={() =>
                    dispatch({
                      type: "SET_CURRENT_STEP",
                      payload: currentStep - 1,
                    })
                  }
                  className="text-sm text-gray-600 hover:text-gray-900 px-8 py-3 rounded-full border border-gray-300 font-medium transition-colors"
                >
                  ← {steps[currentStep - 1]?.label}
                </button>
              ) : (
                <div />
              )}
              {currentStep < steps.length - 1 && (
                <button
                  onClick={() =>
                    canNavigateToStep(currentStep + 1) &&
                    dispatch({
                      type: "SET_CURRENT_STEP",
                      payload: currentStep + 1,
                    })
                  }
                  disabled={!canNavigateToStep(currentStep + 1)}
                  className={clx(
                    "text-sm px-8 py-3 rounded-full font-medium transition-colors",
                    canNavigateToStep(currentStep + 1)
                      ? "text-white bg-[#1e2a3a] hover:bg-[#2a3a4a]"
                      : "text-gray-400 bg-gold-20 cursor-not-allowed"
                  )}
                >
                  {steps[currentStep + 1]?.label} →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky price footer */}
      <PriceFooter
        currency={productData.manufacturer?.currency ?? "EUR"}
        onAddToCart={() => {
          const integrationConfig = buildIntegrationConfiguration(state, priceListId)
          console.log("integration_configuration", integrationConfig)
          // TODO: Cart integration — send integrationConfig as integration_configuration in cart payload
        }}
      />
    </div>
  )
}

export default ConfiguratorContent
