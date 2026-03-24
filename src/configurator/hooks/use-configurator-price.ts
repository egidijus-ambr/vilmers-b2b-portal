"use client"

import { useEffect } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import { getAdvancedProductPrice } from "@configurator/lib/price-utils"

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

    const price = getAdvancedProductPrice(
      product,
      sofaCombinations,
      selectedAdditionalComponents,
      selectedFabric,
      priceListId
    )

    dispatch({ type: "SET_TOTAL_PRICE", payload: price })
  }, [
    productData,
    sofaCombinations,
    selectedAdditionalComponents,
    selectedFabric,
    priceListId,
    dispatch,
  ])
}
