"use client"

import React, { useEffect, useMemo } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import { buildSortedFabricGroups } from "@configurator/lib/group-logic"
import FabricSelector from "./fabric-selector"
import FabricCombinationSelector from "./fabric-combination-selector"
import type { FabricCombination, FabricGroupWithPrice } from "@configurator/lib/types"

type FabricSectionProps = {
  languageCode: string
}

/**
 * Orchestrator for fabric selection. Handles two modes:
 *
 * 1. With combinations: auto-selects first combination, shows one FabricSelector per option
 * 2. Without combinations: shows a single FabricSelector
 *
 * Ported from storefront FabricsWithCombinationsSelect.tsx
 */
const FabricSection = ({ languageCode }: FabricSectionProps) => {
  const { state, dispatch } = useConfigurator()
  const { productData, selectedFabric, selectedFabricCombination } = state

  // Build sorted fabric groups from manufacturer data
  const fabricGroups: FabricGroupWithPrice[] = useMemo(() => {
    const categories = productData?.manufacturer?.fabric_price_category ?? []
    return buildSortedFabricGroups(categories)
  }, [productData?.manufacturer?.fabric_price_category])

  // Get fabric combinations from product data
  const fabricCombinations: FabricCombination[] = useMemo(() => {
    const combos = productData?.advanced_product?.fabricCombinations ?? []
    if (combos.length > 1 && combos[0]?.code) {
      return [...combos].sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""))
    }
    return combos
  }, [productData?.advanced_product?.fabricCombinations])

  const hasCombinations = fabricCombinations.length > 0

  // --- Default selection: auto-select first combination + initialize fabrics ---
  useEffect(() => {
    if (fabricGroups.length === 0) return

    if (hasCombinations) {
      // Auto-select first combination if none selected
      const currentCombinationId = selectedFabricCombination.fabricCombination?.id
      const isValid = fabricCombinations.some((c) => c.id === currentCombinationId)

      if (!isValid) {
        const defaultCombination = fabricCombinations[0]
        dispatch({
          type: "SET_FABRIC_COMBINATION",
          payload: { fabricCombination: defaultCombination },
        })

        // Initialize combination fabrics: each option gets the first fabric of the first group
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
      }
    } else {
      // No combinations: auto-select first fabric if none selected
      if (!selectedFabric.fabricGroupObject || !selectedFabric.fabricObject) {
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
  }, [fabricGroups, fabricCombinations, hasCombinations])

  // --- When combination changes, re-map fabric selections to new options ---
  useEffect(() => {
    if (!hasCombinations) return
    const combination = selectedFabricCombination.fabricCombination
    if (!combination) return

    const options = combination?.fabricCombinationOptions ?? []
    if (options.length === 0) return

    // If no combinationFabrics yet, skip (handled by init above)
    if (!selectedFabric.combinationFabrics) return

    const existingValues = Object.values(selectedFabric.combinationFabrics)
    const newCombinationFabrics: Record<string, any> = {}

    for (const option of options) {
      // Try to find an existing selection with the same option code
      const existing = existingValues.find(
        (v: any) => v.option?.code === option.code
      ) ?? existingValues[0]

      newCombinationFabrics[option.id] = {
        ...existing,
        option,
      }
    }

    // Only update if actually changed
    if (
      JSON.stringify(selectedFabric.combinationFabrics) !==
      JSON.stringify(newCombinationFabrics)
    ) {
      dispatch({
        type: "SET_FABRIC",
        payload: {
          ...selectedFabric,
          combinationFabrics: newCombinationFabrics,
        },
      })
    }
  }, [selectedFabricCombination.fabricCombination?.id])

  if (fabricGroups.length === 0) {
    return null
  }

  // --- Render ---
  if (hasCombinations) {
    const combination = selectedFabricCombination.fabricCombination
    const options = combination?.fabricCombinationOptions ?? (combination as any)?.options ?? []
    const sortedOptions = [...options].sort((a: any, b: any) =>
      (a.code ?? "").localeCompare(b.code ?? "")
    )
    const showOptionTitles = sortedOptions.length > 1

    return (
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold">Fabric Selection</h3>

        {/* Combination switcher (only when >1 combination) */}
        {fabricCombinations.length > 1 && (
          <FabricCombinationSelector
            fabricCombinations={fabricCombinations}
            languageCode={languageCode}
          />
        )}

        {/* One FabricSelector per combination option */}
        {sortedOptions.map((option: any) => {
          const profile =
            option.fabricCombinationOptionProfiles?.find(
              (p: any) => p.language === languageCode
            ) ?? option.fabricCombinationOptionProfiles?.[0]
          const optionName = profile?.name ?? option.code

          return (
            <FabricSelector
              key={option.id}
              fabricGroups={fabricGroups}
              option={option}
              title={showOptionTitles ? optionName : null}
              languageCode={languageCode}
            />
          )
        })}
      </div>
    )
  }

  // No combinations: single fabric selector
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold">Fabric Selection</h3>
      <FabricSelector
        fabricGroups={fabricGroups}
        option={null}
        title={null}
        languageCode={languageCode}
      />
    </div>
  )
}

export default FabricSection
