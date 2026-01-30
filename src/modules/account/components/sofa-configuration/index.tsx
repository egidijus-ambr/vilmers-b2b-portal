"use client"

import React, { useRef } from "react"
import dynamic from "next/dynamic"
import { OrderDetailItem } from "@lib/furnisystems-sdk/modules/customer/types"
import { useTranslations } from "@lib/i18n"

// Dynamically import Konva-based preview (requires browser DOM, no SSR)
const SofaDrawingPreview = dynamic(
  () =>
    import("../../../../configurator/SofaDrawingElements/SofaDrawingPreview"),
  { ssr: false }
)

// --- Types ---

interface SofaConfigurationDetailProps {
  item: OrderDetailItem
}

interface ParsedSofaDimensions {
  width: number
  length: number
  height: number
  armrestWidth: number
}

interface ParsedSofaSet {
  setIndex: number
  parts: {
    moduleName: string
    moduleCode: string
    shapeType: string
    price: number
  }[]
  dimensions: ParsedSofaDimensions | null
}

interface KonvaShape {
  attrs: {
    type?: string
    x?: number
    y?: number
    width?: number
    height?: number
    originalWidth?: number
    originalHeight?: number
    rotation?: number
    originalSofaForm?: {
      code?: string
      enabled_connectors?: string[]
      dimensions?: {
        width?: number
        height?: number
        length?: number
        armrest_width?: number
        backrest_width?: number
        mattress_width?: number
        mattress_length?: number
        corner_part_length?: number
        corner_radius?: number
        composition?: string
        seat_height?: number
        angle?: number
        extendable_part_length?: number
        number_of_big_pillows?: number
        number_of_small_pillows?: number
        spread_of_big_pillows?: number
        spread_of_small_pillows?: number
        size_of_big_pillow?: number
        size_of_pillow?: number
        seat_sections?: number
        backrest_sections?: number
        extension_type?: string
        backrest_type?: string
        covered_side?: boolean
      }
    }
    new_armrest_width?: number
  }
}

// --- Parse sofa combinations JSON ---

function parseShapeItem(item: any): KonvaShape | null {
  try {
    const obj = typeof item === "string" ? JSON.parse(item) : item
    if (obj?.attrs && typeof obj.attrs === "object") return obj as KonvaShape
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
      .map((combo: any[]) =>
        combo.map(parseShapeItem).filter((s): s is KonvaShape => s !== null)
      )
  } catch {
    return []
  }
}

// --- Parse sofa sets from metadata ---

function parseSofaSets(item: OrderDetailItem): ParsedSofaSet[] {
  const configurations = item.metadata?.configurations
  if (!Array.isArray(configurations)) return []

  const combinations = item.cart_item?.selected_sofa_combinations
    ? parseSofaCombinations(item.cart_item.selected_sofa_combinations)
    : []

  // Build dimension lookup from combinations
  const konvaDimensions: Record<string, any> = {}
  for (const combo of combinations) {
    for (const shape of combo) {
      const code = shape?.attrs?.originalSofaForm?.code
      const dims = shape?.attrs?.originalSofaForm?.dimensions
      if (code && dims) {
        konvaDimensions[code] = {
          width: dims.width || 0,
          height: dims.height || 0,
          length: dims.length || 0,
          armrest_width: dims.armrest_width || 0,
        }
      }
    }
  }

  return configurations.map((setParts: any[], setIndex: number) => {
    const parts = (setParts || []).map((part: any) => ({
      moduleName: part.moduleName || "",
      moduleCode: part.moduleCode || "",
      shapeType: part.shapeType || "",
      price: part.price || 0,
    }))

    let dimensions: ParsedSofaDimensions | null = null
    const konvaPartDims = parts
      .map((p) => konvaDimensions[p.moduleCode])
      .filter(Boolean)

    if (konvaPartDims.length > 0) {
      dimensions = {
        width: konvaPartDims.reduce(
          (sum: number, d: any) => sum + (d.width || 0),
          0
        ),
        length: Math.max(...konvaPartDims.map((d: any) => d.length || 0)),
        height: konvaPartDims[0]?.height || 0,
        armrestWidth: konvaPartDims[0]?.armrest_width || 0,
      }
    }

    return { setIndex, parts, dimensions }
  })
}

// --- Sofa set canvas wrapper ---

interface SofaSetPreviewProps {
  shapes: KonvaShape[]
  maxWidth?: number
  maxHeight?: number
}

const SofaSetPreview: React.FC<SofaSetPreviewProps> = ({
  shapes,
  maxWidth = 400,
  maxHeight = 250,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  if (shapes.length === 0) return null

  return (
    <div
      ref={containerRef}
      style={{ width: maxWidth, height: maxHeight, position: "relative" }}
    >
      <SofaDrawingPreview
        combination={shapes}
        parentRef={containerRef}
        sofaScale={1}
      />
    </div>
  )
}

// --- Main component ---

const SofaConfigurationDetail: React.FC<SofaConfigurationDetailProps> = ({
  item,
}) => {
  const { t } = useTranslations("account")

  const isSofa = item.cart_item?.advanced_product_type === "SOFA"
  const hasConfigurations =
    item.metadata?.configurations &&
    Array.isArray(item.metadata.configurations) &&
    item.metadata.configurations.length > 0

  if (!isSofa || !hasConfigurations) return null

  const sofaSets = parseSofaSets(item)
  const combinations = item.cart_item?.selected_sofa_combinations
    ? parseSofaCombinations(item.cart_item.selected_sofa_combinations)
    : []

  const fabricCode = item.cart_item?.fabric_code
  const fabricGroupName = item.cart_item?.fabric_group_name

  return (
    <div className="px-4 py-4 sm:px-6">
      <h4 className="text-sm font-semibold text-dark-blue mb-4">
        {t("configuration")}
      </h4>

      {sofaSets.map((sofaSet, idx) => {
        // Match this sofa set to a combination by index
        const comboShapes = combinations[idx] || []

        return (
          <div
            key={idx}
            className={`${idx > 0 ? "mt-6 pt-6 border-t border-gray-200" : ""}`}
          >
            {sofaSets.length > 1 && (
              <h5 className="text-sm font-medium text-dark-blue mb-3">
                {t("sofa-set")} {idx + 1}
              </h5>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-5">
                {(fabricCode || fabricGroupName) && (
                  <div>
                    <h6 className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-2">
                      {t("fabric")}
                    </h6>
                    <div className="bg-white p-3 rounded border border-gray-100 text-xs space-y-0.5">
                      {fabricGroupName && (
                        <p className="text-dark-blue-70">
                          {t("group")}: {fabricGroupName}
                        </p>
                      )}
                      {fabricCode && (
                        <p className="text-dark-blue-70">
                          {t("color")}: {fabricCode}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {sofaSet.dimensions && (
                  <div>
                    <h6 className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-2">
                      {t("dimensions")}
                    </h6>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {sofaSet.dimensions.width > 0 && (
                        <div className="flex justify-between">
                          <span className="text-dark-blue-70">
                            {t("width")}:
                          </span>
                          <span className="text-dark-blue font-medium">
                            {sofaSet.dimensions.width} cm
                          </span>
                        </div>
                      )}
                      {sofaSet.dimensions.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-dark-blue-70">
                            {t("length")}:
                          </span>
                          <span className="text-dark-blue font-medium">
                            {sofaSet.dimensions.length} cm
                          </span>
                        </div>
                      )}
                      {sofaSet.dimensions.height > 0 && (
                        <div className="flex justify-between">
                          <span className="text-dark-blue-70">
                            {t("height")}:
                          </span>
                          <span className="text-dark-blue font-medium">
                            {sofaSet.dimensions.height} cm
                          </span>
                        </div>
                      )}
                      {sofaSet.dimensions.armrestWidth > 0 && (
                        <div className="flex justify-between">
                          <span className="text-dark-blue-70">
                            {t("armrest-width")}:
                          </span>
                          <span className="text-dark-blue font-medium">
                            {sofaSet.dimensions.armrestWidth} cm
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {sofaSet.parts.length > 0 && (
                  <div>
                    <h6 className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-2">
                      {t("parts")}
                    </h6>
                    <ul className="text-xs text-dark-blue space-y-1">
                      {sofaSet.parts.map((part, pIdx) => (
                        <li key={pIdx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-dark-blue-70 flex-shrink-0" />
                          {part.moduleName}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right column: Konva rendering of shapes */}
              <div className="flex items-start justify-center">
                <div className="bg-white p-3 rounded border border-gray-100">
                  {comboShapes.length > 0 ? (
                    <SofaSetPreview shapes={comboShapes} />
                  ) : (
                    <div className="w-[300px] h-[150px] flex items-center justify-center text-gray-400 text-xs">
                      {t("no-image")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default SofaConfigurationDetail
