"use client"

import { useEffect } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import { sdk } from "@lib/config"
import { mergeComponentGroups } from "@configurator/lib/component-utils"
import { buildSortedFabricGroups } from "@configurator/lib/group-logic"
import { useCustomerPaletteIds } from "../lib/palette-utils"
import type { SelectedComponent } from "@configurator/lib/types"

type CustomerAdditionalComponent = {
  additionalComponent: {
    code: string
    additional_component_group: { code: string }
  }
}

/**
 * Hook to lazy-load configurator data when the modal opens.
 * Fetches product configurator data and dispatches it to context.
 *
 * @param customerAdditionalComponents - The customer's mandatory additional component
 *   selections (from customer.additional_components). When provided, these are
 *   pre-seeded into state BEFORE useDynamicGroups runs default-component selection,
 *   so the customer's mandatory picks are never overwritten by defaults.
 */
export function useConfiguratorData(
  productContainerId: number | null,
  priceListId: number,
  language: string,
  isOpen: boolean,
  customerAdditionalComponents?: CustomerAdditionalComponent[]
) {
  const { dispatch } = useConfigurator()
  const paletteIds = useCustomerPaletteIds()
  const paletteKey = paletteIds.join(",")

  // Stable key derived from customer mandates — avoids referential churn on the dep array
  const customerMandatesKey = (customerAdditionalComponents ?? [])
    .map((ac) => `${ac.additionalComponent?.additional_component_group?.code}:${ac.additionalComponent?.code}`)
    .join(",")

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
        const productGroupAssociations = data.advanced_product?.additional_component_group_to_advanced_product ?? []

        // Filter to only groups associated with this product
        const enabledGroupIds = new Set(
          productGroupAssociations.map((a: any) => a.additional_component_group?.id).filter(Boolean)
        )
        const filteredManufacturerGroups = enabledGroupIds.size > 0
          ? manufacturerGroups.filter((g: any) => enabledGroupIds.has(g.id))
          : manufacturerGroups

        if (filteredManufacturerGroups.length > 0) {
          const mergedGroups = mergeComponentGroups(
            filteredManufacturerGroups,
            productAssociations,
            priceListId
          )
          dispatch({ type: "SET_COMPONENT_GROUPS", payload: mergedGroups })
          dispatch({ type: "SET_ORIGINAL_COMPONENT_GROUPS", payload: mergedGroups })

          // Pre-seed customer mandatory component selections BEFORE useDynamicGroups
          // runs its default-selection logic. useDynamicGroups skips groups that
          // already have a selection (existingGroupCodes check), so these seeds
          // take precedence over selectDefaultComponents defaults.
          if (customerAdditionalComponents && customerAdditionalComponents.length > 0) {
            const seeds: SelectedComponent[] = []
            for (const customerAc of customerAdditionalComponents) {
              const groupCode = customerAc.additionalComponent?.additional_component_group?.code
              const componentCode = customerAc.additionalComponent?.code
              if (!groupCode || !componentCode) continue

              const matchedGroup = mergedGroups.find((g) => g.code === groupCode)
              if (!matchedGroup) continue

              const matchedComponent = matchedGroup.additional_components.find(
                (c) => c.code === componentCode
              )
              if (!matchedComponent) continue

              seeds.push({ ...matchedComponent, groupCode: matchedGroup.code })
            }
            if (seeds.length > 0) {
              dispatch({ type: "SET_SELECTED_COMPONENTS", payload: seeds })
            }
          }
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
            const defaultCombination = [...fabricCombinations].sort((a: any, b: any) => {
              if (a.code == null && b.code == null) return 0
              if (a.code == null) return 1
              if (b.code == null) return -1
              const aNum = Number(a.code)
              const bNum = Number(b.code)
              if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
              return a.code.localeCompare(b.code)
            })[0] ?? fabricCombinations[0]
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
  }, [isOpen, productContainerId, priceListId, language, dispatch, paletteKey, customerMandatesKey])
}
