"use client"

import React, { useCallback, useState } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import type { SofaFormExtended } from "@configurator/lib/types"
import { getDefaultArmrestWidth } from "@configurator/lib/group-logic"
import SofaModulesSelector from "./sofa-modules-selector"
import SofaStageContainer from "./sofa-stage-container"

export interface Dropable {
  id: string
  sofaForm: SofaFormExtended
}

type SofaShapeSectionProps = {
  languageCode: string
  showAllProducts?: boolean
}

/**
 * Orchestrator for sofa shape configuration.
 * Combines the module selector (compact row + drawer) with the
 * interactive Konva stage where users arrange sofa modules.
 */
const SofaShapeSection = ({ languageCode, showAllProducts = false }: SofaShapeSectionProps) => {
  const { state, dispatch } = useConfigurator()
  const { sofaForms } = state

  const defaultArmrest = React.useMemo(() => {
    // Check if any selected component has armrest_width
    const selectedArm = state.selectedAdditionalComponents.find(
      (c) => c.dimensions?.armrest_width != null && c.dimensions.armrest_width > 0
    )
    if (selectedArm && selectedArm.dimensions) {
      const name = selectedArm.additional_component_profiles?.[0]?.name ?? selectedArm.code ?? ""
      return { width: selectedArm.dimensions.armrest_width as number, name }
    }
    // Fall back to original (unmodified) groups — dynamic groups remove the base
    // "armrest" group when no modules are on canvas, so we need the original
    return getDefaultArmrestWidth(state.originalComponentGroups)
  }, [state.selectedAdditionalComponents, state.originalComponentGroups])

  const effectiveArmrestWidth = defaultArmrest?.width ?? undefined

  // Local state for shapes currently on the canvas
  const [dropables, setDropables] = useState<Dropable[]>([])

  const addSofaToStage = useCallback(
    (sofaForm: SofaFormExtended) => {
      const id = Date.now().toString()
      setDropables((prev) => [...prev, { id, sofaForm }])
    },
    []
  )

  const onSofaDelete = useCallback((id: string) => {
    setDropables((prev) => prev.filter((d) => d.id !== id))
  }, [])

  // Sync Konva connected groups back to context for price calculation / cart
  const handleCombinationsChange = useCallback(
    (groups: any[][]) => {
      dispatch({ type: "SET_SOFA_COMBINATIONS", payload: groups })
    },
    [dispatch]
  )

  if (sofaForms.length === 0) {
    return (
      <div className="bg-gray-50 p-8 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-400 text-sm">No sofa modules available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Module selector row — opens drawer to browse & add modules */}
      <SofaModulesSelector
        sofaForms={sofaForms}
        onAddForm={addSofaToStage}
        languageCode={languageCode}
        armrestWidthOverride={effectiveArmrestWidth}
        armrestName={defaultArmrest?.name}
        showAllProducts={showAllProducts}
      />

      {/* Interactive Konva stage with toolbar controls */}
      <div className="bg-gold-10 mx-auto m-0">
        <SofaStageContainer
          sofaShapes={dropables}
          onSofaDelete={onSofaDelete}
          onCombinationsChange={handleCombinationsChange}
        />
      </div>
    </div>
  )
}

export default SofaShapeSection
