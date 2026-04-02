"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import type { SofaFormExtended } from "@configurator/lib/types"
import { getArmrestOverides } from "@configurator/SofaDrawingElements/utils"
import { setNewSize } from "@configurator/lib/sofa-shape-utils"
import { getDefaultArmrestWidth } from "@configurator/lib/group-logic"
import SofaModulesSelector from "./sofa-modules-selector"
import SofaStageContainer from "./sofa-stage-container"

export interface Dropable {
  id: string
  sofaForm: SofaFormExtended
}

type SofaShapeSectionProps = {
  languageCode: string
}

/**
 * Orchestrator for sofa shape configuration.
 * Combines the module selector (compact row + drawer) with the
 * interactive Konva stage where users arrange sofa modules.
 */
const SofaShapeSection = ({ languageCode }: SofaShapeSectionProps) => {
  const { state, dispatch } = useConfigurator()
  const { sofaForms } = state

  // Compute effective armrest width: selected armrest's width > default armrest's width > null
  const effectiveArmrestWidth = React.useMemo(() => {
    // Check if any selected component has armrest_width
    const selectedArmWidth = state.selectedAdditionalComponents.find(
      (c) => c.dimensions?.armrest_width != null
    )?.dimensions?.armrest_width as number | undefined

    if (selectedArmWidth != null) return selectedArmWidth

    // Fall back to default armrest component's width
    return getDefaultArmrestWidth(state.additionalComponentGroups) ?? undefined
  }, [state.selectedAdditionalComponents, state.additionalComponentGroups])

  // Local state for shapes currently on the canvas
  const [dropables, setDropables] = useState<Dropable[]>([])

  const addSofaToStage = useCallback((sofaForm: SofaFormExtended) => {
    const id = Date.now().toString()

    // Apply current armrest width to the new module
    let adjustedForm = sofaForm
    if (effectiveArmrestWidth != null) {
      adjustedForm = {
        ...sofaForm,
        dimensions: { ...sofaForm.dimensions },
        originalDimension: { ...sofaForm.originalDimension },
      }
      setNewSize(adjustedForm, effectiveArmrestWidth)
    }

    setDropables((prev) => [...prev, { id, sofaForm: adjustedForm }])
  }, [effectiveArmrestWidth])

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

  // Update sofa module dimensions when armrest selection changes
  useEffect(() => {
    const overrides = getArmrestOverides(state.selectedAdditionalComponents)
    if (overrides.length === 0) return

    setDropables((prev) => {
      if (prev.length === 0) return prev

      let hasChanges = false
      const updated = prev.map((dropable) => {
        const override =
          overrides.find((o: any) => o.moduleId === dropable.id) ??
          overrides.find((o: any) => !o.moduleId)
        if (!override) return dropable

        if (dropable.sofaForm.dimensions.armrest_width === override.armrestWidth) {
          return dropable
        }

        const clonedSofaForm = {
          ...dropable.sofaForm,
          dimensions: { ...dropable.sofaForm.dimensions },
          originalDimension: { ...dropable.sofaForm.originalDimension },
        }
        setNewSize(clonedSofaForm, override.armrestWidth)
        hasChanges = true
        return { ...dropable, sofaForm: clonedSofaForm }
      })

      return hasChanges ? updated : prev
    })
  }, [state.selectedAdditionalComponents])

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
      />

      {/* Interactive Konva stage with toolbar controls */}
      <div className="bg-white mx-auto max-w-4xl">
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
