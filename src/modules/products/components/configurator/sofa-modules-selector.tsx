"use client"

import React, { useState } from "react"
import dynamic from "next/dynamic"
import type { SofaFormExtended } from "@configurator/lib/types"
import SofaModulesDrawer from "./sofa-modules-drawer"

type SofaModulesSelectorProps = {
  sofaForms: SofaFormExtended[]
  onAddForm: (sofaForm: SofaFormExtended) => void
  languageCode: string
}

// =============================================
// Konva preview — client-side only
// =============================================

function SelectorPreviewInner({ sofaForm }: { sofaForm: SofaFormExtended }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Stage, Layer } =
    require("react-konva") as typeof import("react-konva")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SofaElements =
    require("@configurator/SofaDrawingElements/SofaElements") as Record<
      string,
      React.ComponentType<any>
    >
  const SofaElement = SofaElements[sofaForm.type]

  const dims = sofaForm.dimensions
  const rawW = dims.width ?? 100
  const rawH = dims.length ?? dims.height ?? 100
  const extraH = dims.extendable_part_length ?? 0
  const armW = dims.armrest_width ?? 22
  const padding = 10
  const totalW = rawW + armW * 2 + padding * 2
  const totalH = rawH + extraH + padding * 2
  const stageSize = 80
  const fitScale = Math.min(stageSize / totalW, stageSize / totalH)
  const stageW = Math.round(totalW * fitScale)
  const stageH = Math.round(totalH * fitScale)

  if (!SofaElement) {
    return (
      <span className="text-[9px] text-gray-400 font-bold text-center px-0.5 leading-tight">
        {sofaForm.type}
      </span>
    )
  }

  return (
    <Stage
      width={stageW}
      height={stageH}
      scaleX={fitScale}
      scaleY={fitScale}
      listening={false}
      style={{ display: "block" }}
    >
      <Layer>
        <SofaElement
          id={sofaForm.id.toString()}
          x={armW + padding}
          y={padding}
          width={rawW}
          height={rawH}
          draggable={false}
          verticalMetric={false}
          horizontalMetric={false}
          showButtons={false}
          scale={fitScale}
          stageWidth={stageW}
          stageHeight={stageH}
          armrestWidth={dims.armrest_width}
          backrestWidth={dims.backrest_width}
          mattressWidth={dims.mattress_width}
          mattressLength={dims.mattress_length}
          enabled_connectors={sofaForm.enabled_connectors}
          cornerPartLength={dims.corner_part_length}
          cornerRadius={dims.corner_radius}
          composition={dims.composition}
          angle={dims.angle}
          seatHeight={dims.seat_height}
          extendablePartLength={dims.extendable_part_length}
          numberOfBigPillows={dims.number_of_big_pillows}
          numberOfSmallPillows={dims.number_of_small_pillows}
          spreadOfBigPillows={dims.spread_of_big_pillows}
          spreadOfSmallPillows={dims.spread_of_small_pillows}
          sizeOfBigPillow={dims.size_of_big_pillow}
          sizeOfPillow={dims.size_of_pillow}
          seatSections={dims.seat_sections}
          backrestSections={dims.backrest_sections}
          extensionType={dims.extension_type}
          backrestType={dims.backrest_type}
          coveredSide={dims.covered_side}
        />
      </Layer>
    </Stage>
  )
}

const SelectorPreview = dynamic(() => Promise.resolve(SelectorPreviewInner), {
  ssr: false,
})

// =============================================
// Selector component
// =============================================

const SofaModulesSelector = ({
  sofaForms,
  onAddForm,
  languageCode,
}: SofaModulesSelectorProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const previewForms = [...sofaForms]
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 11)

  const extraCount = sofaForms.length > 11 ? sofaForms.length - 11 : 0

  return (
    <>
      {/* Compact clickable row */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="w-full flex gap-3 pr-4 border border-gray-200 hover:border-gray-400 transition-colors text-left"
      >
        {/* Label block */}
        <div className="w-48 shrink-0 h-28 flex flex-col justify-end pb-2 pl-3 border-r border-gray-200 bg-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
            Sofa Modules
          </p>
          <p className="text-sm font-medium text-gray-900">
            {sofaForms.length} available
          </p>
        </div>

        {/* Thumbnails row with fade-out on right edge */}
        <div className="relative flex-1 min-w-0 overflow-hidden h-28 flex items-center">
          {/* Fade-out gradient overlay */}
          <div
            className="absolute inset-y-0 right-0 w-32 pointer-events-none z-10"
            style={{
              background: "linear-gradient(to right, transparent, white)",
            }}
          />

          {/* Thumbnails */}
          <div className="flex items-start gap-3">
            {previewForms.map((form) => (
              <div
                key={form.id}
                className="w-20 shrink-0 flex flex-col items-center gap-0.5"
                title={form.name}
              >
                <div className="w-20 h-20 flex items-center justify-center overflow-hidden">
                  <SelectorPreview sofaForm={form} />
                </div>
                <p className="text-[9px] text-gray-600 text-center leading-tight line-clamp-1 w-full">
                  {form.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Extra count badge */}
        {extraCount > 0 && (
          <div className="shrink-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-gray-700">
              +{extraCount}
            </span>
            <span className="text-[10px] text-gray-500">more</span>
          </div>
        )}

        {/* Chevron */}
        <svg
          className="w-4 h-4 text-gray-400 shrink-0 self-end mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Drawer */}
      <SofaModulesDrawer
        isOpen={drawerOpen}
        close={() => setDrawerOpen(false)}
        sofaForms={sofaForms}
        onAddForm={onAddForm}
        languageCode={languageCode}
      />
    </>
  )
}

export default SofaModulesSelector
