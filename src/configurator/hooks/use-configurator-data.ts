"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "@lib/i18n"
import { useConfigurator } from "@configurator/context/configurator-context"
import { getConfiguratorDataAction } from "@lib/data/configurator"
import { mergeComponentGroups } from "@configurator/lib/component-utils"
import { buildSortedFabricGroups, pickDefaultFabric } from "@configurator/lib/group-logic"
import { getFabricCategoryAvailability, resolveMainGroup } from "@configurator/lib/price-utils"
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
 * The price list is resolved SERVER-side from the session's acting customer
 * (falling back to the shop default list); the id actually used is returned
 * so pricing reads the same list the rows were fetched for. It is null until
 * the first load completes.
 *
 * @param actingCustomerKey - Changes whenever the acting customer changes
 *   (e.g. an agent switches customer) so the data — and the server-derived
 *   price list — is refetched.
 * @param customerAdditionalComponents - The customer's mandatory additional component
 *   selections (from customer.additional_components). When provided, these are
 *   pre-seeded into state BEFORE useDynamicGroups runs default-component selection,
 *   so the customer's mandatory picks are never overwritten by defaults.
 */
export function useConfiguratorData(
  productContainerId: number | null,
  actingCustomerKey: string,
  language: string,
  isOpen: boolean,
  customerAdditionalComponents?: CustomerAdditionalComponent[]
): number | null {
  const { dispatch } = useConfigurator()
  const { t } = useTranslations("account")
  const { t: tc } = useTranslations("common")
  // Kept in refs so a translator identity change never re-triggers the fetch effect
  const tRef = useRef(t)
  tRef.current = t
  const tcRef = useRef(tc)
  tcRef.current = tc
  const [priceListId, setPriceListId] = useState<number | null>(null)
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
        const result = await getConfiguratorDataAction(
          productContainerId!,
          language,
          paletteIds
        )

        if (cancelled) return

        if (!result) {
          dispatch({ type: "SET_ERROR", payload: tRef.current("configurator-data-load-error") })
          return
        }

        const { data, priceListId } = result
        // Same batch as SET_PRODUCT_DATA, so productData and the list it was
        // fetched for never disagree.
        setPriceListId(priceListId)
        dispatch({ type: "SET_PRODUCT_DATA", payload: data })

        // Initialize additional component groups from product-scoped join tables.
        // Both arrays are already filtered to enabled=true by the query WHERE clause.
        let componentGroupsForDefaults: any[] = []
        const groupAssociations = data.advanced_product?.additional_component_group_to_advanced_product ?? []
        const componentAssociations = data.advanced_product?.additional_component_to_advanced_product ?? []

        if (groupAssociations.length > 0) {
          const mergedGroups = mergeComponentGroups(
            groupAssociations,
            componentAssociations,
            priceListId
          )
          componentGroupsForDefaults = mergedGroups
          dispatch({ type: "SET_COMPONENT_GROUPS", payload: mergedGroups })
          dispatch({ type: "SET_ORIGINAL_COMPONENT_GROUPS", payload: mergedGroups })

          // Pre-seed customer mandatory component selections BEFORE useDynamicGroups
          // runs its default-selection logic. useDynamicGroups skips groups that
          // already have a selection (existingGroupCodes check), so these seeds
          // take precedence over selectDefaultComponents defaults.
          if (customerAdditionalComponents && customerAdditionalComponents.length > 0) {
            const seeds: SelectedComponent[] = []
            const seenGroupCodes = new Set<string>()
            for (const customerAc of customerAdditionalComponents) {
              const groupCode = customerAc.additionalComponent?.additional_component_group?.code
              const componentCode = customerAc.additionalComponent?.code
              if (!groupCode || !componentCode) continue
              if (seenGroupCodes.has(groupCode)) continue

              const matchedGroup = mergedGroups.find((g) => g.code === groupCode)
              if (!matchedGroup) continue

              const matchedComponent = matchedGroup.additional_components.find(
                (c) => c.code === componentCode
              )
              if (!matchedComponent) continue

              seenGroupCodes.add(groupCode)
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
          // Default = first colour that is priced for this product (not blindly fabrics[0]).
          const mainGroup = resolveMainGroup(data.advanced_product, componentGroupsForDefaults, [])
          const defaultPick = pickDefaultFabric(
            fabricGroups,
            (n) =>
              n == null
                ? "available"
                : getFabricCategoryAvailability({
                    candidate: n,
                    sofaCombinations: [],
                    sofaForms,
                    mainGroup,
                  })
          )
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

            const defaultGroup = defaultPick?.group ?? fabricGroups[0]
            const defaultFabric = defaultPick?.fabric ?? null
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
            const defaultGroup = defaultPick?.group ?? fabricGroups[0]
            const defaultFabric = defaultPick?.fabric ?? null
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
          payload: error instanceof Error ? error.message : tcRef.current("unknown-error"),
        })
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [isOpen, productContainerId, actingCustomerKey, language, dispatch, paletteKey, customerMandatesKey])

  return priceListId
}
