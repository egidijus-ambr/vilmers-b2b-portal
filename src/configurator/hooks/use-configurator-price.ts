"use client"

import { useEffect } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import {
  computeAdvancedProductPrice,
  productRequiresBasePrice,
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

    // Products without sofa modules (e.g. OTHER_WITH_FABRICS) are priced by
    // their own fabric-category price, so a missing one must block.
    const requireBasePrice = productRequiresBasePrice(productData.advanced_product)

    const result = computeAdvancedProductPrice(
      product,
      sofaCombinations,
      selectedAdditionalComponents,
      selectedFabric,
      priceListId,
      requireBasePrice
    )

    dispatch({ type: "SET_TOTAL_PRICE", payload: result.total })
    dispatch({
      type: "SET_PRICE_ISSUES",
      payload: {
        unpricedModuleIds: result.unpricedModuleIds,
        basePriceMissing: result.baseMissing,
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
