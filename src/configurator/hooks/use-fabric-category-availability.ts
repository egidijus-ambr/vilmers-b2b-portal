"use client"

import { useCallback } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import {
  isFabricCategoryUnavailable,
  productRequiresBasePrice,
  getSelectedGroupNumbers,
} from "@configurator/lib/price-utils"

/**
 * Returns a predicate telling whether a fabric price category (by group
 * number) is unavailable for the current canvas, using the same price lookups
 * as the total (see isFabricCategoryUnavailable). `optionId` is the
 * combination option being edited (null outside combination mode).
 */
export function useFabricCategoryAvailability(optionId: number | string | null) {
  const { state } = useConfigurator()
  const { productData, sofaCombinations, sofaForms, selectedFabric } = state

  return useCallback(
    (groupNumber: number | null | undefined): boolean => {
      if (groupNumber == null) return false

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

      return isFabricCategoryUnavailable({
        candidate: groupNumber,
        otherGroupNumbers,
        sofaCombinations,
        sofaForms,
        productPriceCategories:
          productData?.advanced_product?.advanced_product_price_fabric_category ?? [],
        requireBasePrice: productRequiresBasePrice(productData?.advanced_product),
      })
    },
    [productData, sofaCombinations, sofaForms, selectedFabric, optionId]
  )
}
