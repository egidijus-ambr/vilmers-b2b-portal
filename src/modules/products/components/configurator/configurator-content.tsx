"use client"

import React, { useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { clx } from "@medusajs/ui"
import { useConfigurator } from "@configurator/context/configurator-context"
import { useConfiguratorData } from "@configurator/hooks/use-configurator-data"
import { useConfiguratorPrice } from "@configurator/hooks/use-configurator-price"
import { useDynamicGroups } from "@configurator/hooks/use-dynamic-groups"
import { getStepsForProduct } from "@configurator/lib/component-utils"
import FabricSection from "./fabric-section"
import ComponentSection from "./component-section"
import ConfiguratorStepper from "./configurator-stepper"
import PriceFooter from "./price-footer"
import ConfigurationSummary from "./configuration-summary"

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
  priceListId,
  isOpen,
}: ConfiguratorContentProps) => {
  // Load data on-demand when modal opens
  useConfiguratorData(productContainerId, priceListId, languageCode, isOpen)

  // Recalculate price when selections change
  useConfiguratorPrice(priceListId)

  const { state, dispatch } = useConfigurator()
  const { productData, isLoading, error } = state

  // Activate dynamic group computation (armrests, legs, threads)
  useDynamicGroups(state.originalComponentGroups)

  const isSofa = productData?.advanced_product?.advanced_product_type === "SOFA"

  // Compute visible steps
  const steps = useMemo(
    () =>
      getStepsForProduct(
        state.additionalComponentGroups,
        state.selectedAdditionalComponents,
        state.sofaCombinations,
        isSofa
      ),
    [state.additionalComponentGroups, state.selectedAdditionalComponents, state.sofaCombinations, isSofa]
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
            <div className="bg-gray-50 p-8 flex items-center justify-center min-h-[400px]">
              <p className="text-gray-400 text-sm">Product preview</p>
            </div>
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
          ) : (
            <FabricSection languageCode={languageCode} />
          )}

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
                  className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300"
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
                    "text-sm px-6 py-2.5 font-medium",
                    canNavigateToStep(currentStep + 1)
                      ? "text-white bg-[#1e2a3a] hover:bg-[#2a3a4a]"
                      : "text-gray-400 bg-gray-200 cursor-not-allowed"
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
          // TODO: Cart integration — Phase 6
          console.log("Add to cart — to be implemented")
        }}
      />
    </div>
  )
}

export default ConfiguratorContent
