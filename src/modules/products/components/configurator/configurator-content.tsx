"use client"

import React, { useCallback, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { clx } from "@medusajs/ui"
import { useConfigurator } from "@configurator/context/configurator-context"
import { useConfiguratorData } from "@configurator/hooks/use-configurator-data"
import { useConfiguratorPrice } from "@configurator/hooks/use-configurator-price"
import { useDynamicGroups } from "@configurator/hooks/use-dynamic-groups"
import { buildIntegrationConfiguration } from "@configurator/lib/vilmers"
import {
  getStepsForProduct,
  getMissingRequiredGroupCodes,
  getGroupName,
  getValidComponents,
} from "@configurator/lib/component-utils"
import {
  getCustomerPriceListIds,
  getPrimaryPriceListId,
} from "@configurator/lib/pricelist"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import { useCart } from "@lib/context/cart-context"
import { useCustomerPaletteIds } from "@configurator/lib/palette-utils"
import { useDebugMode } from "@lib/hooks/use-debug-mode"
import { useTranslations } from "@lib/i18n"
import ReferenceStep from "./reference-step"
import { MissingReferenceModal } from "./missing-reference-modal"
import FabricSection from "./fabric-section"
import ComponentSection from "./component-section"
import ConfiguratorStepper from "./configurator-stepper"
import PriceFooter from "./price-footer"
import ConfigurationSummary from "./configuration-summary"
import ProductPreviewSection from "./product-preview-section"
import Toast from "@modules/common/components/toast"

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
  showAllProducts?: boolean
  embedded?: boolean
}

const ConfiguratorContent = ({
  productContainerId,
  languageCode,
  priceListId: priceListIdProp,
  isOpen,
  showAllProducts = false,
  embedded = false,
}: ConfiguratorContentProps) => {
  const isDebug = useDebugMode()
  const { actingCustomer: customer, actingCustomer, isImpersonatedByManager } = useActingCustomer() as { actingCustomer: any; isImpersonatedByManager: boolean }
  const { addItem, items } = useCart()
  const paletteIds = useCustomerPaletteIds()
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [showReferenceModal, setShowReferenceModal] = useState(false)
  const { t } = useTranslations("account")

  // Use the customer's effective pricelist (direct wins over group). The
  // configurator data layer needs a single ID; charges always come from the
  // direct pricelist when set, falling back to the group's, then the prop.
  const customerPriceListIds = useMemo(
    () => getCustomerPriceListIds(customer),
    [customer]
  )
  const priceListId =
    getPrimaryPriceListId(customer) ?? priceListIdProp

  // Load data on-demand when modal opens.
  // Pass customer.additional_components so mandatory picks are pre-seeded into
  // state before useDynamicGroups runs its default-selection logic.
  useConfiguratorData(productContainerId, priceListId, languageCode, isOpen, customer?.additional_components)

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

  const { singleEntryGroupCodes, multiEntryCustomerComponentCodesByGroup } = useMemo(() => {
    const countByGroup = new Map<string, string[]>()
    customer?.additional_components?.forEach((ac: any) => {
      const groupCode = ac.additionalComponent?.additional_component_group?.code
      const componentCode = ac.additionalComponent?.code
      if (!groupCode || !componentCode) return
      if (!countByGroup.has(groupCode)) countByGroup.set(groupCode, [])
      countByGroup.get(groupCode)!.push(componentCode)
    })
    const single = new Set<string>()
    const multi = new Map<string, Set<string>>()
    countByGroup.forEach((codes, groupCode) => {
      if (codes.length === 1) {
        single.add(groupCode)
      } else {
        multi.set(groupCode, new Set(codes))
      }
    })
    return { singleEntryGroupCodes: single, multiEntryCustomerComponentCodesByGroup: multi }
  }, [customer?.additional_components])

  // Required-group validation: enforce a selection in `model` / `model-other`
  // when those groups have at least one user-selectable component. We MUST
  // run the same `getValidComponents` filter the renderer uses, otherwise a
  // group whose components are all hidden by `hide_components_without_price`
  // (e.g. customer has no price for any of them) would still appear required
  // and lock add-to-cart with nothing to click.
  const missingRequiredGroupNames = useMemo(() => {
    const visibleGroups = state.additionalComponentGroups.map((g) => ({
      ...g,
      additional_components: getValidComponents(
        g,
        state.selectedAdditionalComponents,
        state.sofaCombinations,
        { priceListIds: customerPriceListIds, showAllProducts }
      ),
    }))
    const missingCodes = getMissingRequiredGroupCodes(
      visibleGroups,
      state.selectedAdditionalComponents
    )
    if (missingCodes.length === 0) return []
    return missingCodes.map((code) => {
      const group = state.additionalComponentGroups.find((g) => g.code === code)
      return group ? getGroupName(group, languageCode) : code
    })
  }, [
    state.additionalComponentGroups,
    state.selectedAdditionalComponents,
    state.sofaCombinations,
    customerPriceListIds,
    showAllProducts,
    languageCode,
  ])

  const steps = useMemo(
    () => [
      ...getStepsForProduct(
        state.additionalComponentGroups,
        state.selectedAdditionalComponents,
        state.sofaCombinations,
        isSofa,
        hasFabricSelection,
        singleEntryGroupCodes,
        { priceListIds: customerPriceListIds, showAllProducts },
        multiEntryCustomerComponentCodesByGroup
      ),
      { id: "reference" as any, label: t("customer-reference"), groups: [] },
    ],
    [state.additionalComponentGroups, state.selectedAdditionalComponents, state.sofaCombinations, isSofa, hasFabricSelection, singleEntryGroupCodes, customerPriceListIds, showAllProducts, multiEntryCustomerComponentCodesByGroup, t]
  )

  const currentStep = Math.min(state.currentStep, Math.max(steps.length - 1, 0))
  const currentStepDef = steps[currentStep]

  // Sofa modules validation: at least one module must be on canvas
  const hasSofaModules = (state.sofaCombinations?.length ?? 0) > 0 &&
    state.sofaCombinations!.some((group) => group.length > 0)

  // Build configuration strings for display below canvas
  const configStrings = useMemo(() => {
    const configs = buildIntegrationConfiguration(state, priceListId)
    const result: { setId: number; itemId: number; module: string; configString: string }[] = []
    configs?.forEach((set: any, setIndex: number) => {
      set?.forEach((item: any, itemIndex: number) => {
        result.push({
          setId: setIndex + 1,
          itemId: itemIndex + 1,
          module: item.moduleCode,
          configString: item.configuration,
        })
      })
    })
    return result
  }, [
    state.sofaCombinations,
    state.selectedFabric,
    state.selectedAdditionalComponents,
    state.selectedFabricCombination,
    state.pricesPerModule,
    state.productData,
    priceListId,
  ])

  // Calculate total volume from sofa modules + additional components
  const totalVolume = useMemo(() => {
    // Sum sofa module volumes from Konva node attrs
    const sofaVolume = state.sofaCombinations.reduce(
      (acc, combination) =>
        acc +
        combination.reduce((innerAcc, item) => {
          const pkgDims = item.attrs?.originalSofaForm?.package_dimensions
          if (!pkgDims) return innerAcc
          return (
            innerAcc +
            pkgDims.reduce(
              (sum: number, pkg: { volume: number }) => sum + pkg.volume,
              0
            )
          )
        }, 0),
      0
    )

    // Sum additional component volumes (double for LR armrests)
    const componentsVolume = state.selectedAdditionalComponents.reduce(
      (acc, component) => {
        const pkgDims = component.package_dimensions
        if (!pkgDims) return acc
        let count = 1
        if (
          component.groupCode?.startsWith("armrest") &&
          component.groupNameOverride?.endsWith(" LR")
        ) {
          count = 2
        }
        return (
          acc +
          pkgDims.reduce(
            (sum: number, pkg: { volume: number }) => sum + pkg.volume,
            0
          ) *
            count
        )
      },
      0
    )

    return sofaVolume + componentsVolume
  }, [state.sofaCombinations, state.selectedAdditionalComponents])

  const handleAddToCart = useCallback(async (reference: string) => {
    if (!productData?.id) return
    try {
      await addItem({
        productContainerId: productData.id,
        product_type: productData.product_type || "SIMPLE_PRODUCT",
        advanced_product_type: productData.advanced_product?.advanced_product_type,
        quantity: state.quantity,
        price: state.totalPrice ?? undefined,
        volume: totalVolume ?? undefined,
        fabricId: state.selectedFabric.fabricObject?.id,
        fabric_groupId: state.selectedFabric.fabricGroupObject?.id,
        fabricCombinationId: state.selectedFabricCombination?.fabricCombination?.id,
        fabric_code: state.selectedFabric.fabricObject?.code,
        fabric_group_name: state.selectedFabric.fabricGroupObject?.name,
        selected_sofa_combinations: state.sofaCombinations.length > 0
          ? JSON.stringify(state.sofaCombinations)
          : undefined,
        additionalComponentIds: state.selectedAdditionalComponents
          .filter((c) => c.id != null)
          .map((c) => c.id),
        componentsByModule: state.selectedAdditionalComponents
          .filter((c) => c.id != null && c.groupCode && c.groupCode.includes('-'))
          .map((c) => ({
            additionalComponentId: c.id as number,
            groupCode: c.groupCode,
          })),
        cartItemFabrics: state.selectedFabric.combinationFabrics
          ? Object.values(state.selectedFabric.combinationFabrics)
              .filter((f: any) => f?.fabricObject?.id)
              .map((f: any) => ({
                fabricId: f.fabricObject?.id,
                fabric_groupId: f.fabricGroupObject?.id,
                combination_optionId: f.option?.id,
              }))
          : undefined,
        customerReference: reference,
      })
      setToast({ message: "Item added to cart", type: "success" })
    } catch (error) {
      setToast({ message: "Failed to add item to cart", type: "error" })
    }
  }, [productData, state, totalVolume, addItem])

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
    <div className={clx("flex flex-col", !embedded && "h-full overflow-y-auto md:overflow-hidden")}>
      {/* Main content area — 2 panel layout */}
      <div className={clx("flex flex-col md:flex-row md:flex-1 gap-6", !embedded && "md:overflow-hidden px-4 md:px-6")}>
        {/* Left panel: Shape selection + canvas */}
        <div className={clx("w-full md:w-2/3 md:pr-2 pt-6 pb-2 md:pb-6", !embedded && "md:overflow-y-auto")}>
          {isSofa ? (
            <SofaShapeSection languageCode={languageCode} showAllProducts={showAllProducts} />
          ) : (
            <ProductPreviewSection languageCode={languageCode} />
          )}
          {(isDebug || actingCustomer || isImpersonatedByManager) && configStrings.length > 0 && (
            <div className="flex flex-col gap-0.5 px-1 py-2">
              {configStrings.map((config, i) => (
                <p key={i} className="text-xs font-mono text-gray-500">
                  <span className="font-semibold text-gray-700">{config.setId}.{config.itemId}</span>{" "}
                  <span className="font-semibold text-gray-700">{config.module}</span>{" "}
                  {config.configString}
                </p>
              ))}
            </div>
          )}
          {/* Desktop only — mobile copy is rendered at the bottom of the outer container */}
          <div className="hidden md:block">
            <ConfigurationSummary languageCode={languageCode} />
          </div>
        </div>

        {/* Right panel: Stepper + Step Content */}
        <div className={clx("w-full md:w-1/3 md:pl-2 space-y-6 pt-2 md:pt-6", !embedded && "md:overflow-y-auto", embedded && "pb-20")}>
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
          {isDebug && <details className="text-[11px] border border-dashed border-gray-300 bg-gray-50/50">
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
                {customer?.fabric_palettes?.map((p: any) => p.id).join(", ") || <span className="text-red-400">none</span>}
              </div>
              <div>
                <span className="text-gray-400">Group palettes:</span>{" "}
                {customer?.customer_group?.fabric_palettes?.map((p: any) => p.id).join(", ") || <span className="text-red-400">none</span>}
              </div>
              <div>
                <span className="text-gray-400">Price List ID:</span>{" "}
                {priceListId}
              </div>
              <div>
                <span className="text-gray-400">Customer price list:</span>{" "}
                {customer?.price_listId ?? <span className="text-red-400">none</span>}
              </div>
              <div>
                <span className="text-gray-400">Group price list:</span>{" "}
                {customer?.group_price_listId ?? <span className="text-red-400">none</span>}
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
              <div>
                <span className="text-gray-400">Customer components:</span>{" "}
                {customer?.additional_components?.length > 0
                  ? customer.additional_components.map((ac: any) =>
                      `${ac.additionalComponent?.additional_component_group?.code}: ${ac.additionalComponent?.code}`
                    ).join(", ")
                  : <span className="text-red-400">none</span>}
              </div>
            </div>
          </details>}

          {/* Step content */}
          {currentStepDef?.id === "reference" ? (
            <ReferenceStep />
          ) : currentStepDef?.id === "sofa-modules" ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sofa Modules</h3>
              <p className="text-sm text-gray-500">
                Select and arrange sofa modules on the canvas to build your configuration.
              </p>
              {paletteIds.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-sm text-amber-700">
                    You don't have a fabric palette assigned. Without a palette you won't be able to see module prices, pick a fabric, or place an order. Please contact your manager.
                  </p>
                </div>
              )}
              {paletteIds.length > 0 && !hasSofaModules && (
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
              priceListIds={customerPriceListIds}
              showAllProducts={showAllProducts}
              multiEntryCustomerComponentCodesByGroup={multiEntryCustomerComponentCodesByGroup}
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

      {/* Mobile only — Selected Options summary at the bottom, below stepper/content */}
      <div className="md:hidden px-4">
        <ConfigurationSummary languageCode={languageCode} />
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          cartItemCount={toast.type === "success" ? items.length : undefined}
          cartHref={toast.type === "success" ? `/${languageCode}/cart` : undefined}
          onClose={() => setToast(null)}
        />
      )}

      {/* Sticky price footer */}
      <div className={clx(embedded && "sticky bottom-0 z-20")}>
        <PriceFooter
          currency={productData.manufacturer?.currency ?? "EUR"}
          volume={totalVolume}
          missingRequiredGroupNames={missingRequiredGroupNames}
          onAddToCart={async () => {
            if (!state.referenceText.trim()) {
              setShowReferenceModal(true)
              return
            }
            await handleAddToCart(state.referenceText.trim())
          }}
        />
      </div>

      <MissingReferenceModal
        isOpen={showReferenceModal}
        onConfirm={async (reference) => {
          setShowReferenceModal(false)
          dispatch({ type: "SET_REFERENCE_TEXT", payload: reference })
          await handleAddToCart(reference)
        }}
        onCancel={() => setShowReferenceModal(false)}
      />
    </div>
  )
}

export default ConfiguratorContent
