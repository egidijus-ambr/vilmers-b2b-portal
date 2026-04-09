"use client"

import React, { useCallback, useRef, useState } from "react"
import SofaDrawingPreview from "@configurator/SofaDrawingElements/SofaDrawingPreview"
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
  armrest_width: number
}

interface SetPart {
  name: string
}

// =============================================
// Helpers
// =============================================

function extractSetData(combination: any[]): {
  dimensions: SetDimensions
  parts: SetPart[]
} {
  let totalWidth = 0
  let maxLength = 0
  let firstHeight = 0
  let firstArmrestWidth = 0
  let heightSet = false
  let armrestSet = false
  const parts: SetPart[] = []

  for (const node of combination) {
    const sofaForm = node?.attrs?.originalSofaForm
    if (!sofaForm) continue

    const dims = sofaForm.dimensions
    if (dims) {
      totalWidth += dims.width || 0
      if ((dims.length || 0) > maxLength) maxLength = dims.length || 0
      if (!heightSet) {
        firstHeight = dims.height || 0
        heightSet = true
      }
      if (!armrestSet) {
        firstArmrestWidth = dims.armrest_width || 0
        armrestSet = true
      }
    }

    const partName = sofaForm.name || sofaForm.code
    if (partName) {
      parts.push({ name: partName })
    }
  }

  return {
    dimensions: {
      width: totalWidth,
      length: maxLength,
      height: firstHeight,
      armrest_width: firstArmrestWidth,
    },
    parts,
  }
}

// =============================================
// Component
// =============================================

const SofaSetCard = ({ combination, setIndex, totalSets }: SofaSetCardProps) => {
  const { t } = useTranslations("account")
  const [drawingEl, setDrawingEl] = useState<HTMLDivElement | null>(null)
  const drawingRef = useRef<HTMLDivElement | null>(null)

  const drawingCallbackRef = useCallback((node: HTMLDivElement | null) => {
    drawingRef.current = node
    setDrawingEl(node)
  }, [])

  const { dimensions, parts } = extractSetData(combination)

  const dimensionRows = [
    { label: t("width"), value: dimensions.width },
    { label: t("length"), value: dimensions.length },
    { label: t("height"), value: dimensions.height },
    { label: t("armrest-width"), value: dimensions.armrest_width },
  ].filter((r) => r.value > 0)

  return (
    <div className="border border-gray-100 rounded-lg p-3">
      {totalSets > 1 && (
        <p className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-2">
          {t("set")} {setIndex + 1}
        </p>
      )}
      <div className="flex gap-4">
        {/* Drawing */}
        <div ref={drawingCallbackRef} className="flex-1 min-h-[120px] bg-gray-50 rounded">
          {drawingEl && (
            <SofaDrawingPreview
              combination={combination}
              parentRef={drawingRef as React.RefObject<HTMLElement>}
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
                    {row.value} cm
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
