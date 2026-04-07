"use client"

import { useEffect } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import { sdk } from "@lib/config"
import { mergeComponentGroups } from "@configurator/lib/component-utils"
import { buildSortedFabricGroups } from "@configurator/lib/group-logic"
import { useCustomerPaletteIds } from "../lib/palette-utils"

/**
 * Hook to lazy-load configurator data when the modal opens.
 * Fetches product configurator data and dispatches it to context.
 */
export function useConfiguratorData(
  productContainerId: number | null,
  priceListId: number,
  language: string,
  isOpen: boolean
) {
  const { dispatch } = useConfigurator()
  const paletteIds = useCustomerPaletteIds()
  const paletteKey = paletteIds.join(",")

  useEffect(() => {
    if (!isOpen || !productContainerId) return

    let cancelled = false

    async function loadData() {
      dispatch({ type: "SET_LOADING", payload: true })

      try {
        const data = await sdk.products.getConfiguratorData(
          productContainerId!,
          priceListId,
          language,
          paletteIds
        )

        if (cancelled) return

        if (!data) {
          dispatch({ type: "SET_ERROR", payload: "Failed to load configurator data" })
          return
        }

        dispatch({ type: "SET_PRODUCT_DATA", payload: data })

        // Initialize additional component groups
        const manufacturerGroups = data.manufacturer?.additional_component_groups ?? []
        const productAssociations = data.advanced_product?.additional_component_to_advanced_product ?? []

        if (manufacturerGroups.length > 0) {
          const mergedGroups = mergeComponentGroups(
            manufacturerGroups,
            productAssociations,
            priceListId
          )
          dispatch({ type: "SET_COMPONENT_GROUPS", payload: mergedGroups })
          dispatch({ type: "SET_ORIGINAL_COMPONENT_GROUPS", payload: mergedGroups })
        }

        // Initialize sofa forms with originalDimension
        const sofaForms = (data.advanced_product?.sofa_forms ?? []).map(
          (form: any) => ({
            ...form,
            originalDimension: {
              width: form.dimensions?.width ?? 0,
              height: form.dimensions?.height ?? 0,
            },
          })
        )
        dispatch({ type: "SET_SOFA_FORMS", payload: sofaForms })

        // Auto-select the first fabric so prices are available on step 0
        const fabricGroups = buildSortedFabricGroups(
          data.manufacturer?.fabric_price_category ?? []
        )

        if (fabricGroups.length > 0) {
          const fabricCombinations = data.advanced_product?.fabricCombinations ?? []

          if (fabricCombinations.length > 0) {
            const defaultCombination = fabricCombinations[0]
            dispatch({
              type: "SET_FABRIC_COMBINATION",
              payload: { fabricCombination: defaultCombination },
            })

            const defaultGroup = fabricGroups[0]
            const defaultFabric = defaultGroup?.fabrics?.[0] ?? null
            const options = defaultCombination.fabricCombinationOptions ?? []
            const initialCombinationFabrics: Record<string, any> = {}
            for (const option of options) {
              initialCombinationFabrics[option.id] = {
                fabricGroupObject: defaultGroup,
                fabricObject: defaultFabric,
                option,
              }
            }
            dispatch({
              type: "SET_FABRIC",
              payload: {
                fabricGroupObject: defaultGroup,
                fabricObject: defaultFabric,
                combinationFabrics: initialCombinationFabrics,
              },
            })
          } else {
            const defaultGroup = fabricGroups[0]
            const defaultFabric = defaultGroup?.fabrics?.[0] ?? null
            if (defaultGroup && defaultFabric) {
              dispatch({
                type: "SET_FABRIC",
                payload: {
                  fabricGroupObject: defaultGroup,
                  fabricObject: defaultFabric,
                  combinationFabrics: null,
                },
              })
            }
          }
        }
      } catch (error) {
        if (cancelled) return
        console.error("Error loading configurator data:", error)
        dispatch({
          type: "SET_ERROR",
          payload: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [isOpen, productContainerId, priceListId, language, dispatch, paletteKey])
}
