"use client"

import { useCallback } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import {
  getFabricCategoryAvailability,
  type FabricCategoryAvailability,
  resolveMainGroup,
  getSelectedGroupNumbers,
} from "@configurator/lib/price-utils"

/**
 * Returns a function giving the availability (available | disabled | hidden) of
 * a fabric price category (by group number) for the current canvas, using the same price lookups
 * as the total (see getFabricCategoryAvailability). `optionId` is the
 * combination option being edited (null outside combination mode).
 */
export function useFabricCategoryAvailability(optionId: number | string | null) {
  const { state } = useConfigurator()
  const {
    productData,
    sofaCombinations,
    sofaForms,
    selectedFabric,
    originalComponentGroups,
    selectedAdditionalComponents,
  } = state

  return useCallback(
    (groupNumber: number | null | undefined): FabricCategoryAvailability => {
      if (groupNumber == null) return "available"

      // In combination mode the best price across all option categories is
      // used, so the other options' categories count alongside the candidate.
      let otherGroupNumbers: number[] = []
      if (optionId != null && selectedFabric.combinationFabrics) {
        const others = { ...selectedFabric.combinationFabrics }
        delete others[optionId as any]
        otherGroupNumbers = getSelectedGroupNumbers({
          ...selectedFabric,
          combinationFabrics: others,
        })
      }

      // The category of the fabric currently selected (for this option in
      // combination mode) must never vanish: hidden degrades to disabled.
      const currentGroup = optionId != null
        ? selectedFabric.combinationFabrics?.[optionId as any]?.fabricGroupObject
        : selectedFabric.fabricGroupObject
      const currentGroupNumber = currentGroup?.form_price_fabric_category?.group_number

      const result = getFabricCategoryAvailability({
        candidate: groupNumber,
        otherGroupNumbers,
        sofaCombinations,
        sofaForms,
        mainGroup: resolveMainGroup(
          productData?.advanced_product,
          originalComponentGroups,
          selectedAdditionalComponents
        ),
      })
      if (result === "hidden" && currentGroupNumber === groupNumber) return "disabled"
      return result
    },
    [
      productData,
      sofaCombinations,
      sofaForms,
      selectedFabric,
      originalComponentGroups,
      selectedAdditionalComponents,
      optionId,
    ]
  )
}
