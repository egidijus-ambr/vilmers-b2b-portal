"use client"

import React, { useCallback, useRef, useState } from "react"
import SofaDrawingPreview, {
  DEFAULT_LIVE_METRIC_PADDING,
} from "@configurator/SofaDrawingElements/SofaDrawingPreview"
import { getArmrestsPosition, ArmrestsPosition } from "@configurator/lib/sofa-shape-utils"
import { getArmrestOverides } from "@configurator/SofaDrawingElements/utils"
import { useConfigurator } from "@configurator/context/configurator-context"
import { isValidMeasurement } from "@configurator/lib/types"
import { useTranslations } from "@lib/i18n"

// =============================================
// Types
// =============================================

type SofaSetCardProps = {
  /** Array of Konva nodes for one connected group */
  combination: any[]
  /** Zero-based index of this set */
  setIndex: number
  /** Total number of sets (label only shown when > 1) */
  totalSets: number
}

interface SetDimensions {
  width: number
  length: number
  height: number
  armrest_width_left: number | null
  armrest_width_right: number | null
  extendable_part_length: number
}

interface SetPart {
  name: string
}

// =============================================
// Helpers
// =============================================

function extractSetData(combination: any[], armrestOverrides: Array<{ armrestWidth: number; moduleId: string }>): {
  dimensions: SetDimensions
  parts: SetPart[]
} {
  let totalWidth = 0
  let maxLength = 0
  let firstHeight = 0
  let heightSet = false
  let armrestLeftWidth: number | null = null
  let armrestRightWidth: number | null = null
  let maxExtension = 0
  const parts: SetPart[] = []

  for (const node of combination) {
    const sofaForm = node?.attrs?.originalSofaForm
    if (!sofaForm) continue

    const dims = sofaForm.dimensions
    if (dims) {
      // Use the node's armrestPosition attr (set by the shape's getDimensions)
      // rather than guessing from type string — open-end modules end in L/R
      // but don't actually have armrests
      const nodeArmPos = node?.attrs?.armrestPosition || ""
      let armsCount = 0
      if (nodeArmPos === "LR") armsCount = 2
      else if (nodeArmPos === "L" || nodeArmPos === "R") armsCount = 1

      const originalArmWidth = dims.armrest_width || 0
      const override = armrestOverrides.find((o: any) => o.moduleId === node?.attrs?.id) ?? armrestOverrides.find((o: any) => !o.moduleId)
      const newArmWidth = override?.armrestWidth ?? originalArmWidth
      const adjustedWidth = (dims.width || 0) + armsCount * (newArmWidth - originalArmWidth)
      totalWidth += adjustedWidth

      if ((dims.length || 0) > maxLength) maxLength = dims.length || 0
      if (!heightSet) {
        firstHeight = dims.height || 0
        heightSet = true
      }

      // Armrest width — only for modules that actually have armrests
      if (armsCount > 0) {
        if ((nodeArmPos === "L" || nodeArmPos === "LR") && armrestLeftWidth === null) {
          armrestLeftWidth = newArmWidth
        }
        if ((nodeArmPos === "R" || nodeArmPos === "LR") && armrestRightWidth === null) {
          armrestRightWidth = newArmWidth
        }
      }

      // Extension height
      const ext = dims.extendable_part_length || 0
      if (ext > maxExtension) maxExtension = ext
    }

    const partName = sofaForm.name || sofaForm.code
    if (partName) {
      parts.push({ name: partName })
    }
  }

  return {
    // totalWidth/maxLength are naive per-module sums with no rotation
    // awareness (e.g. an arm module rotated 90° onto a corner's other side
    // adds to width instead of length). They are used only as a fallback
    // for when the rendered-drawing measurement (sofaMeasurements) isn't
    // available yet — see SofaSetCard below.
    dimensions: {
      width: totalWidth,
      length: maxLength,
      height: firstHeight,
      armrest_width_left: armrestLeftWidth,
      armrest_width_right: armrestRightWidth,
      extendable_part_length: maxExtension,
    },
    parts,
  }
}

// =============================================
// Component
// =============================================

const SofaSetCard = ({
  combination,
  setIndex,
  totalSets,
}: SofaSetCardProps) => {
  const { t } = useTranslations("account")
  const [drawingEl, setDrawingEl] = useState<HTMLDivElement | null>(null)
  const drawingRef = useRef<HTMLDivElement | null>(null)

  const drawingCallbackRef = useCallback((node: HTMLDivElement | null) => {
    drawingRef.current = node
    setDrawingEl(node)
  }, [])

  const { state: configuratorState } = useConfigurator()
  const armrestWidthOverrides = React.useMemo(() => {
    return getArmrestOverides(configuratorState?.selectedAdditionalComponents ?? [])
  }, [configuratorState?.selectedAdditionalComponents])

  const { dimensions, parts } = extractSetData(combination, armrestWidthOverrides)

  // Rotation-aware width/depth measured from the rendered drawing — the
  // source of truth. Falls back to the naive per-module sum (extractSetData)
  // only until the drawing has produced a measurement for this set index.
  // isValidMeasurement guards BOTH width and depth jointly (not just
  // null/undefined, and not per-field) — a group whose children haven't
  // rendered yet can produce a non-null but partially/fully-zeroed
  // measurement (e.g. {width: 300, depth: 0}), and `dimensionRows` below
  // filters out zero-value rows entirely, so an independent per-field
  // guard would show Width from the measurement while add-to-cart (which
  // uses the same joint guard) omits attrs.measured for that same set —
  // keep both consumers in agreement.
  const rawMeasured = configuratorState.sofaMeasurements?.[setIndex]
  const measured = isValidMeasurement(rawMeasured) ? rawMeasured : null
  const displayWidth = measured ? measured.width : dimensions.width
  const displayLength = measured ? measured.depth : dimensions.length

  // Build dimension rows with conditional armrest and extension lines
  const baseRows: { label: string; value: number }[] = [
    { label: t("width"), value: displayWidth },
    { label: t("length"), value: displayLength },
    { label: t("height"), value: dimensions.height },
  ]

  // Extension height
  if (dimensions.extendable_part_length > 0) {
    baseRows.push({ label: t("extension-height"), value: dimensions.extendable_part_length })
  }

  // Armrest width — conditional on module types
  const { armrest_width_left: awL, armrest_width_right: awR } = dimensions
  if (awL !== null && awR !== null && awL !== awR) {
    baseRows.push({ label: `${t("armrest-width")} (L)`, value: awL })
    baseRows.push({ label: `${t("armrest-width")} (R)`, value: awR })
  } else if (awL !== null) {
    baseRows.push({ label: t("armrest-width"), value: awL })
  } else if (awR !== null) {
    baseRows.push({ label: t("armrest-width"), value: awR })
  }

  const dimensionRows = baseRows.filter((r) => r.value > 0)

  return (
    <div className="border border-gray-100 rounded-lg p-3">
      {totalSets > 1 && (
        <p className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-2">
          {t("set")} {setIndex + 1}
        </p>
      )}
      <div className="flex gap-4">
        {/* Drawing */}
        <div
          ref={drawingCallbackRef}
          className="flex-1 min-h-[200px] bg-gray-50 rounded"
        >
          {drawingEl && (
            <SofaDrawingPreview
              combination={combination}
              parentRef={drawingRef as React.RefObject<HTMLElement>}
              metricPadding={DEFAULT_LIVE_METRIC_PADDING}
              armrestWidthOverrides={armrestWidthOverrides}
            />
          )}
        </div>

        {/* Dimensions + Parts */}
        <div className="flex-1 flex flex-col gap-3">
          {dimensionRows.length > 0 && (
            <div className="space-y-1 text-xs">
              {dimensionRows.map((row) => (
                <div key={row.label} className="flex items-baseline gap-2">
                  <span className="text-dark-blue-70 whitespace-nowrap">
                    {row.label}
                  </span>
                  <span className="flex-1 border-b border-dashed border-gray-300" />
                  <span className="text-dark-blue font-medium whitespace-nowrap">
                    {Math.round(row.value)} cm
                  </span>
                </div>
              ))}
            </div>
          )}

          {parts.length > 0 && (
            <ul className="text-xs text-dark-blue space-y-1">
              {parts.map((part, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-dark-blue-70 flex-shrink-0" />
                  {part.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default SofaSetCard
