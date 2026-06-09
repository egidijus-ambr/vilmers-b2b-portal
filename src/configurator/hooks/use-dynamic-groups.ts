"use client"

import { useEffect, useRef } from "react"
import { isEqual } from "lodash"
import { useConfigurator } from "@configurator/context/configurator-context"
import {
  computeArmrestAndLegsGroups,
  computeThreadGroups,
  reconcileSelectedComponents,
  selectDefaultComponents,
} from "@configurator/lib/group-logic"
import type { ComponentGroup } from "@configurator/lib/types"
import type { ValidComponentsOptions } from "@configurator/lib/component-utils"

/**
 * Hook that dynamically modifies additional component groups based on:
 * - Sofa module selections → per-module armrest & legs groups
 * - Fabric selection + contrast stitching → per-fabric thread-color groups
 *
 * Runs whenever sofaCombinations, selectedAdditionalComponents, or selectedFabric changes.
 *
 * `getOptionsForGroup` must return the SAME `ValidComponentsOptions` the drawer
 * uses to render a group (priceListIds, showAllProducts manager mode, and the
 * per-group customerComponentCodesForGroup). It is supplied by the rendering
 * component (configurator-content.tsx) because those inputs (customer
 * pricelists, manager mode, multi-entry customer codes) live there, not in
 * this hook's state. The reconcile effect needs drawer-identical options so it
 * never resets a selection the drawer would have left valid.
 */
export function useDynamicGroups(
  originalGroups: ComponentGroup[],
  translateFn: (key: string) => string = (key) => key,
  getOptionsForGroup: (
    groupCode: string
  ) => ValidComponentsOptions | undefined = () => undefined
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

      // Remove selected components for groups that no longer exist,
      // and replace any component whose code is no longer valid in its group
      const cleaned = selectedAdditionalComponents
        .filter((c) => validGroupCodes.has(c.groupCode))
        .map((c) => {
          const group = additionalComponentGroups.find((g) => g.code === c.groupCode)
          if (!group) return c
          const stillValid = group.additional_components.some((ac) => ac.code === c.code)
          if (stillValid) return c
          // Selected component no longer available in this group — pick first available
          const replacement = group.additional_components[0]
          if (!replacement) return c
          return {
            ...replacement,
            groupCode: c.groupCode,
            groupNameOverride: c.groupNameOverride,
          }
        })

      // Add defaults for new groups that don't have a selection
      const existingGroupCodes = new Set(cleaned.map((c) => c.groupCode))
      const newGroups = additionalComponentGroups.filter(
        (g) => !existingGroupCodes.has(g.code)
      )

      const newDefaults = newGroups.length > 0
        ? selectDefaultComponents(newGroups, state.selectedAdditionalComponents, state.sofaCombinations ?? [])
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
  }, [sofaCombinations, selectedAdditionalComponents])

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

  // Reconcile stored selections against the drawer's valid set.
  //
  // The cleanup effect above (keyed on [additionalComponentGroups]) only checks
  // RAW group membership (`group.additional_components.some(...)`), not whether
  // a selection is still VALID given sofaCombinations metadata or condition
  // filters. So a default chosen before the sofa module was placed (the Burrow
  // `design-comfort` 2B4M → 2K3I case) survives. This effect re-validates via
  // getValidComponents and replaces stale picks.
  //
  // Keyed widely on [sofaCombinations, additionalComponentGroups,
  // selectedAdditionalComponents] so it catches BOTH metadata-driven staleness
  // (sofaCombinations changes) AND condition-driven staleness (a controlling
  // selection changes and invalidates a dependent onlyWithComponents pick).
  //
  // Dispatch-graph convergence (an isEqual guard only suppresses no-op
  // re-dispatches; it cannot stop a genuine oscillation, so convergence rests
  // on the graph being acyclic, not on the guard):
  //   - The armrest/legs/threads recompute chain settles in bounded rounds
  //     because the selection→group graph is acyclic: armrest group content
  //     depends only on sofaCombinations / module metadata (no selection);
  //     legs group structure depends on the armrest selection but never on the
  //     legs selection; legs/thread selections feed nothing back.
  //   - This reconcile effect only dispatches when reconcileSelectedComponents
  //     returns a value that differs from current AND is an internal fixpoint
  //     (it converges internally, or returns the input unchanged on a
  //     non-convergent cycle), so it cannot oscillate.
  // No fight with the raw-membership cleanup: reconcile picks
  // validComponents[0], which is always a subset of raw additional_components,
  // so the cleanup never undoes a reconcile choice.
  useEffect(() => {
    if (additionalComponentGroups.length === 0) return
    if (selectedAdditionalComponents.length === 0) return

    const reconciled = reconcileSelectedComponents(
      additionalComponentGroups,
      selectedAdditionalComponents,
      sofaCombinations ?? [],
      getOptionsForGroup
    )

    if (!isEqual(reconciled, selectedAdditionalComponents)) {
      dispatch({ type: "SET_SELECTED_COMPONENTS", payload: reconciled })
    }
    // getOptionsForGroup is useCallback-memoized by the caller, so including it
    // is stable; it re-runs the reconcile if the customer's pricelist / manager
    // mode / locked codes change.
  }, [
    sofaCombinations,
    additionalComponentGroups,
    selectedAdditionalComponents,
    getOptionsForGroup,
  ])
}
