"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { SofaFormExtended } from "@configurator/lib/types"

// sofa-drawing-stage is a Konva canvas component that must be created separately.
// The dynamic import is intentional — Konva requires browser DOM (no SSR).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SofaDrawingStage = dynamic<any>(
  () => import("./sofa-drawing-stage" as any),
  { ssr: false }
)

type SofaStageContainerProps = {
  sofaShapes: Array<{ id: string; sofaForm: SofaFormExtended }>
  onSofaDelete: (id: string) => void
  onCombinationsChange?: (groups: any[][]) => void
}

/**
 * Wrapper around the interactive Konva stage.
 * Provides a control toolbar on the left side:
 *   - Toggle delete buttons on shapes
 *   - Toggle metric lines
 *   - Toggle grid
 *   - Zoom in / zoom out
 * Auto-adjusts scale when the number of shapes changes.
 * Shows an instruction placeholder when no shapes are present.
 */
const SofaStageContainer = ({
  sofaShapes,
  onSofaDelete,
  onCombinationsChange,
}: SofaStageContainerProps) => {
  const stageCanvasRef = useRef<HTMLDivElement>(null)

  // --- Controls state
  const [showButtons, setShowButtons] = useState(true)
  const [showArrows, setShowArrows] = useState(true)
  const [showGrid, setShowGrid] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)

  // --- Canvas dimensions
  const [canvasWidth, setCanvasWidth] = useState(760)
  const [canvasHeight, setCanvasHeight] = useState(600)

  // --- Scale
  const [scale, setScale] = useState(1)
  const scaleStep = 0.1

  // Detect small-height viewports (e.g. scaled laptop displays)
  const [isSmallViewport, setIsSmallViewport] = useState(false)

  useEffect(() => {
    const checkViewport = () => {
      setIsSmallViewport(window.innerHeight < 900)
    }
    checkViewport()
    window.addEventListener("resize", checkViewport)
    return () => window.removeEventListener("resize", checkViewport)
  }, [])

  // Measure canvas width from container ref
  useEffect(() => {
    if (stageCanvasRef.current) {
      setCanvasWidth(stageCanvasRef.current.offsetWidth)
    }
  }, [stageCanvasRef])

  // Apply small-viewport adjustments
  useEffect(() => {
    if (isSmallViewport) {
      setCanvasHeight(350)
      setScale(0.8)
    }
  }, [isSmallViewport])

  // Adjust scale and height for narrow canvases (mobile)
  useEffect(() => {
    if (canvasWidth < 700) {
      setCanvasHeight(400)
      setScale(0.6)
    }
  }, [canvasWidth])

  const increaseScale = useCallback(() => {
    setScale((prev) => (prev < 2 ? Math.round((prev + scaleStep) * 10) / 10 : prev))
  }, [])

  const decreaseScale = useCallback(() => {
    setScale((prev) => (prev > 0.3 ? Math.round((prev - scaleStep) * 10) / 10 : prev))
  }, [])

  // Auto-scale when shapes are added/removed on small viewports
  useEffect(() => {
    if (!isSmallViewport) return
    const count = sofaShapes.length

    setScale((prev) => {
      let next = prev
      if (count > 3 && prev > 0.5) next = Math.round((prev - scaleStep) * 10) / 10
      if (count > 5 && prev > 0.4) next = Math.round((prev - scaleStep) * 10) / 10
      if (count < 6 && prev < 0.5) next = Math.round((prev + scaleStep) * 10) / 10
      if (count < 4 && prev < 0.6) next = Math.round((prev + scaleStep) * 10) / 10
      return next
    })
  }, [sofaShapes.length, isSmallViewport])

  return (
    <div className="flex w-full">
      {/* --- Left toolbar --- */}
      <div className="flex flex-col items-center justify-end gap-2 pb-3 px-1 border-r border-[#e7e9ea] shrink-0 w-10 lg:w-12">
        {/* Toggle delete buttons */}
        <ToolbarButton
          title="Toggle shape buttons"
          active={showButtons}
          onClick={() => setShowButtons((v) => !v)}
        >
          {/* Radio button circle icon */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
          </svg>
        </ToolbarButton>

        {/* Toggle metric lines */}
        <ToolbarButton
          title="Toggle metric lines"
          active={showArrows}
          onClick={() => setShowArrows((v) => !v)}
        >
          {/* Ruler / square foot icon */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3zM3 9h4M3 15h4M9 3v4M15 3v4" />
          </svg>
        </ToolbarButton>

        {/* Toggle grid */}
        <ToolbarButton
          title={showGrid ? "Hide grid" : "Show grid"}
          active={showGrid}
          onClick={() => setShowGrid((v) => !v)}
        >
          {showGrid ? (
            /* Grid on */
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
          ) : (
            /* Grid off */
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18M3 3l18 18" />
            </svg>
          )}
        </ToolbarButton>

        {/* Zoom in */}
        <ToolbarButton
          title="Zoom in"
          active={false}
          alwaysBlue
          onClick={increaseScale}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
        </ToolbarButton>

        {/* Zoom out */}
        <ToolbarButton
          title="Zoom out"
          active={false}
          alwaysBlue
          onClick={decreaseScale}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        </ToolbarButton>
      </div>

      {/* --- Drawing canvas area --- */}
      <div
        ref={stageCanvasRef}
        className="flex-1 relative"
        style={{ minHeight: `${canvasHeight}px`, background: "none" }}
      >
        <SofaDrawingStage
          parentRef={stageCanvasRef}
          sofaShapes={sofaShapes}
          onSofaDelete={onSofaDelete}
          onCombinationsChange={onCombinationsChange}
          scale={scale}
          showButtons={showButtons}
          showArrows={showArrows}
          showGrid={showGrid}
        />

        {/* Instruction overlay when canvas is empty */}
        {sofaShapes.length < 1 && (
          <div className="absolute top-1/4 left-[10%] lg:left-[35%] z-[3] text-center">
            {showInstructions ? (
              <div className="relative border border-gray-400 rounded-3xl p-6 lg:p-8 w-[280px] lg:w-[380px] bg-white/80 shadow-sm">
                {/* Close button */}
                <button
                  onClick={() => setShowInstructions(false)}
                  className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 transition-colors rounded"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <img
                  src="/sofa-example.gif"
                  alt="Drag sofa modules"
                  className="w-[220px] lg:w-[320px] mx-auto"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Drag sofa modules onto the canvas to compose your configuration.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 bg-white/80 px-3 py-2 rounded shadow-sm">
                Drag sofa modules onto the canvas to compose your configuration.
              </p>
            )}
          </div>
        )}

        {/* Scale person silhouette for reference */}
        {sofaShapes.length > 0 && showButtons && (
          <div className="absolute bottom-0 w-full text-center pointer-events-none z-[1]" style={{ marginRight: "70px" }}>
            <img
              src="/zmogeliukas.png"
              alt="Scale reference"
              className="w-[120px] lg:w-[200px] inline-block"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// --- Shared toolbar button ---

type ToolbarButtonProps = {
  title: string
  active: boolean
  alwaysBlue?: boolean
  onClick: () => void
  children: React.ReactNode
}

const ToolbarButton = ({
  title,
  active,
  alwaysBlue = false,
  onClick,
  children,
}: ToolbarButtonProps) => {
  let colorClass: string
  if (alwaysBlue) {
    colorClass = "text-[#1e2a3a] hover:bg-[#1e2a3a]/10"
  } else if (active) {
    colorClass = "text-[#1e2a3a] hover:bg-[#1e2a3a]/10"
  } else {
    colorClass = "text-red-500 hover:bg-red-50"
  }

  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 transition-colors rounded ${colorClass}`}
    >
      {children}
    </button>
  )
}

export default SofaStageContainer
