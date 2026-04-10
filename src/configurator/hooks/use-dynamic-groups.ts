"use client"

import { useEffect, useRef } from "react"
import { isEqual } from "lodash"
import { useConfigurator } from "@configurator/context/configurator-context"
import {
  computeArmrestAndLegsGroups,
  computeThreadGroups,
  selectDefaultComponents,
} from "@configurator/lib/group-logic"
import type { ComponentGroup } from "@configurator/lib/types"

/**
 * Hook that dynamically modifies additional component groups based on:
 * - Sofa module selections → per-module armrest & legs groups
 * - Fabric selection + contrast stitching → per-fabric thread-color groups
 *
 * Runs whenever sofaCombinations, selectedAdditionalComponents, or selectedFabric changes.
 */
export function useDynamicGroups(
  originalGroups: ComponentGroup[],
  translateFn: (key: string) => string = (key) => key
) {
  const { state, dispatch } = useConfigurator()
  const {
    sofaCombinations,
    selectedAdditionalComponents,
    selectedFabric,
    additionalComponentGroups,
    sofaForms,
  } = state

  const prevGroupsRef = useRef<ComponentGroup[]>([])

  // Sync selected components when groups change: add defaults for new groups,
  // remove stale selections for groups that no longer exist
  useEffect(() => {
    if (
      additionalComponentGroups.length > 0 &&
      !isEqual(additionalComponentGroups, prevGroupsRef.current)
    ) {
      prevGroupsRef.current = additionalComponentGroups

      const validGroupCodes = new Set(
        additionalComponentGroups.map((g) => g.code)
      )

      // Remove selected components for groups that no longer exist
      const cleaned = selectedAdditionalComponents.filter((c) =>
        validGroupCodes.has(c.groupCode)
      )

      // Add defaults for new groups that don't have a selection
      const existingGroupCodes = new Set(cleaned.map((c) => c.groupCode))
      const newGroups = additionalComponentGroups.filter(
        (g) => !existingGroupCodes.has(g.code)
      )

      const newDefaults = newGroups.length > 0
        ? selectDefaultComponents(newGroups)
        : []

      const updated = [...cleaned, ...newDefaults]
      if (!isEqual(updated, selectedAdditionalComponents)) {
        dispatch({
          type: "SET_SELECTED_COMPONENTS",
          payload: updated,
        })
      }
    }
  }, [additionalComponentGroups])

  // Recompute dynamic groups when sofa combinations change
  useEffect(() => {
    if (originalGroups.length === 0) return

    let updated = computeArmrestAndLegsGroups(
      additionalComponentGroups.length > 0 ? additionalComponentGroups : originalGroups,
      originalGroups,
      sofaCombinations,
      selectedAdditionalComponents,
      translateFn,
      sofaForms
    )

    if (!isEqual(updated, additionalComponentGroups)) {
      dispatch({ type: "SET_COMPONENT_GROUPS", payload: updated })
    }
  }, [sofaCombinations])

  // Recompute thread groups when fabric or components change
  useEffect(() => {
    if (originalGroups.length === 0 || additionalComponentGroups.length === 0) return

    const updated = computeThreadGroups(
      additionalComponentGroups,
      originalGroups,
      selectedAdditionalComponents,
      selectedFabric,
      translateFn
    )

    if (!isEqual(updated, additionalComponentGroups)) {
      dispatch({ type: "SET_COMPONENT_GROUPS", payload: updated })
    }
  }, [selectedAdditionalComponents, selectedFabric])
}
