"use client"

import React, { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"

// Konva-based read-only preview (browser DOM required, no SSR).
const SofaDrawingPreview = dynamic(
  () => import("@configurator/SofaDrawingElements/SofaDrawingPreview"),
  { ssr: false }
)

interface KonvaShape {
  className?: string
  attrs?: Record<string, unknown>
  children?: unknown[]
}

// --- Parse the raw `selected_sofa_combinations` JSON string ---
// (mirrors src/modules/common/components/sofa-configuration/index.tsx)

function parseShapeItem(item: unknown): KonvaShape | null {
  try {
    const obj = typeof item === "string" ? JSON.parse(item) : item
    if (
      obj &&
      typeof obj === "object" &&
      typeof (obj as KonvaShape).attrs === "object"
    ) {
      return obj as KonvaShape
    }
    return null
  } catch {
    return null
  }
}

function parseSofaCombinations(json: string): KonvaShape[][] {
  try {
    const data = JSON.parse(json)
    if (!Array.isArray(data)) return []
    return data
      .filter(Array.isArray)
      .map((combo: unknown[]) =>
        combo.map(parseShapeItem).filter((s): s is KonvaShape => s !== null)
      )
  } catch {
    return []
  }
}

// --- Rehydrate static JSON into live Konva nodes so metric/dimension lines
// render (same pattern as SofaSetPreview in sofa-configuration, ~L184-200) ---

const SofaSetCanvas: React.FC<{ shapes: KonvaShape[]; height: number }> = ({
  shapes,
  height,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [combination, setCombination] = useState<unknown[]>([])

  useEffect(() => {
    if (shapes.length === 0) return
    let active = true
    import("konva").then(({ default: Konva }) => {
      const rehydrated = shapes.map((item: any) => {
        const newGroup = new Konva.Group(item)
        if (item.children) {
          for (const child of item.children) {
            const Ctor = (Konva as any)[child.className]
            if (Ctor) newGroup.add(new Ctor(child))
          }
        }
        return newGroup
      })
      if (active) setCombination(rehydrated)
    })
    return () => {
      active = false
    }
  }, [shapes])

  if (combination.length === 0) return null

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%", position: "relative" }}
    >
      <SofaDrawingPreview
        combination={combination}
        // Repo pins @types/react@19-rc (RefObject<T | null>); SofaDrawingPreview
        // still types parentRef as RefObject<HTMLElement>. Cast to bridge.
        parentRef={containerRef as unknown as React.RefObject<HTMLElement>}
        sofaScale={1}
      />
    </div>
  )
}

interface OfferSofaDiagramProps {
  rawSofaCombinations?: string | null
  height?: number
}

const OfferSofaDiagram: React.FC<OfferSofaDiagramProps> = ({
  rawSofaCombinations,
  height = 250,
}) => {
  if (!rawSofaCombinations) return null

  const combinations = parseSofaCombinations(rawSofaCombinations).filter(
    (combo) => combo.length > 0
  )
  if (combinations.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {combinations.map((shapes, idx) => (
        <SofaSetCanvas key={idx} shapes={shapes} height={height} />
      ))}
    </div>
  )
}

export default OfferSofaDiagram
