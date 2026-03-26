"use client"

import { useEffect } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import { sdk } from "@lib/config"
import { mergeComponentGroups } from "@configurator/lib/component-utils"

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

  useEffect(() => {
    if (!isOpen || !productContainerId) return

    let cancelled = false

    async function loadData() {
      dispatch({ type: "SET_LOADING", payload: true })

      try {
        const data = await sdk.products.getConfiguratorData(
          productContainerId!,
          priceListId,
          language
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
  }, [isOpen, productContainerId, priceListId, language, dispatch])
}
