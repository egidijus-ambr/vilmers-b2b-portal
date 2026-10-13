"use client"

import { useEffect } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import {
  computeAdvancedProductPrice,
  getMainGroupCode,
} from "@configurator/lib/price-utils"

/**
 * Hook that recalculates the total price whenever configurator selections change.
 * Updates the totalPrice in context.
 */
export function useConfiguratorPrice(priceListId: number) {
  const { state, dispatch } = useConfigurator()

  const {
    productData,
    sofaCombinations,
    selectedAdditionalComponents,
    selectedFabric,
  } = state

  useEffect(() => {
    if (!productData) return

    const product = {
      advanced_product: {
        advanced_product_price_fabric_category:
          productData.advanced_product?.advanced_product_price_fabric_category ?? [],
        base_prices: productData.advanced_product?.base_prices ?? [],
      },
    }

    // Component-priced products (beds, tables...) are priced through their
    // main group (model / model-other): an unpriced selection must block.
    const mainGroupCode = getMainGroupCode(productData.advanced_product)

    const result = computeAdvancedProductPrice(
      product,
      sofaCombinations,
      selectedAdditionalComponents,
      selectedFabric,
      priceListId,
      mainGroupCode
    )

    dispatch({ type: "SET_TOTAL_PRICE", payload: result.total })
    dispatch({
      type: "SET_PRICE_ISSUES",
      payload: {
        unpricedModuleIds: result.unpricedModuleIds,
        mainComponentMissing: result.mainComponentMissing,
      },
    })
  }, [
    productData,
    sofaCombinations,
    selectedAdditionalComponents,
    selectedFabric,
    priceListId,
    dispatch,
  ])
}
