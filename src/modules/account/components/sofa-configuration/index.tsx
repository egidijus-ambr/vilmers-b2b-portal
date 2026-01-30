"use client"

import React, { useRef, useEffect, useCallback } from "react"
import { OrderDetailItem } from "@lib/furnisystems-sdk/modules/customer/types"
import { useTranslations } from "@lib/i18n"

// --- Constants matching the shop's Konva renderer ---
const BACK_REST_WIDTH = 25
const ARMS_REST_WIDTH = 22
const SHADOW_WIDTH = 6
const MAIN_SHAPE_COLOR = "#e2e1e0"
const MAIN_SHAPE_SHADOW_COLOR = "rgba(0, 0, 0, 0.10)"
const STROKE_COLOR = "#000"
const CANVAS_PADDING = 20

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

// --- Canvas shape drawing functions ---

function getShapeSize(shape: KonvaShape): { w: number; h: number } {
  const dims = shape.attrs.originalSofaForm?.dimensions
  const type = (shape.attrs.type || "E").toUpperCase()

  const baseW = shape.attrs.originalWidth || shape.attrs.width || 100
  const h = shape.attrs.originalHeight || shape.attrs.height || 80

  // Match shop's width adjustment for armrest override
  const originalArmrest = dims?.armrest_width ?? ARMS_REST_WIDTH
  const armrestOverride = shape.attrs.new_armrest_width
  const isArmrestL =
    type.startsWith("A") && type.endsWith("L") && !type.startsWith("AR")
  const isArmrestR =
    type.startsWith("A") && type.endsWith("R") && !type.startsWith("AR")
  const hasBothArmrests =
    type === "SOFA2" || type === "SOFA1" || type === "SOFA3" ||
    type === "FOTEL" || type.startsWith("SOFA")

  let w = baseW
  if ((isArmrestL || isArmrestR || hasBothArmrests) && armrestOverride != null) {
    w = baseW + armrestOverride - originalArmrest
  }

  return { w, h }
}

function drawShapeE(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backrest: number
) {
  // Main body
  ctx.fillStyle = MAIN_SHAPE_COLOR
  ctx.fillRect(0, 0, w, h)
  ctx.strokeRect(0, 0, w, h)
  // Backrest line
  ctx.beginPath()
  ctx.moveTo(0, backrest)
  ctx.lineTo(w, backrest)
  ctx.stroke()
  // Shadow
  ctx.strokeStyle = MAIN_SHAPE_SHADOW_COLOR
  ctx.lineWidth = SHADOW_WIDTH
  ctx.beginPath()
  ctx.moveTo(2, backrest + SHADOW_WIDTH - 2)
  ctx.lineTo(w - 2, backrest + SHADOW_WIDTH - 2)
  ctx.stroke()
}

function drawShapeCornerL(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backrest: number
) {
  // Fill the full rectangle
  ctx.fillStyle = MAIN_SHAPE_COLOR
  ctx.fillRect(0, 0, w, h)
  ctx.strokeRect(0, 0, w, h)
  // Diagonal corner line (top-left to backrest junction)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(backrest, backrest)
  ctx.stroke()
  // Vertical backrest line (left side)
  ctx.beginPath()
  ctx.moveTo(backrest, backrest)
  ctx.lineTo(backrest, h)
  ctx.stroke()
  // Horizontal backrest line (top)
  ctx.beginPath()
  ctx.moveTo(backrest, backrest)
  ctx.lineTo(w, backrest)
  ctx.stroke()
  // Shadows
  ctx.strokeStyle = MAIN_SHAPE_SHADOW_COLOR
  ctx.lineWidth = SHADOW_WIDTH
  ctx.beginPath()
  ctx.moveTo(backrest + SHADOW_WIDTH - 2, backrest + SHADOW_WIDTH - 2)
  ctx.lineTo(backrest + SHADOW_WIDTH - 2, h - 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(backrest + 1, backrest + SHADOW_WIDTH - 2)
  ctx.lineTo(w - 2, backrest + SHADOW_WIDTH - 2)
  ctx.stroke()
}

function drawShapeCornerR(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backrest: number
) {
  ctx.fillStyle = MAIN_SHAPE_COLOR
  ctx.fillRect(0, 0, w, h)
  ctx.strokeRect(0, 0, w, h)
  // Diagonal corner line (top-right)
  ctx.beginPath()
  ctx.moveTo(w, 0)
  ctx.lineTo(w - backrest, backrest)
  ctx.stroke()
  // Vertical backrest line (right side)
  ctx.beginPath()
  ctx.moveTo(w - backrest, backrest)
  ctx.lineTo(w - backrest, h)
  ctx.stroke()
  // Horizontal backrest line (top)
  ctx.beginPath()
  ctx.moveTo(0, backrest)
  ctx.lineTo(w - backrest, backrest)
  ctx.stroke()
  // Shadows
  ctx.strokeStyle = MAIN_SHAPE_SHADOW_COLOR
  ctx.lineWidth = SHADOW_WIDTH
  ctx.beginPath()
  ctx.moveTo(w - backrest - SHADOW_WIDTH + 2, backrest + SHADOW_WIDTH - 2)
  ctx.lineTo(w - backrest - SHADOW_WIDTH + 2, h - 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(w - backrest - 1, backrest + SHADOW_WIDTH - 2)
  ctx.lineTo(2, backrest + SHADOW_WIDTH - 2)
  ctx.stroke()
}

function drawShapeA2L(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backrest: number,
  armrest: number
) {
  ctx.fillStyle = MAIN_SHAPE_COLOR
  // Left armrest
  ctx.fillRect(0, 0, armrest, h)
  ctx.strokeRect(0, 0, armrest, h)
  // Main seating area
  ctx.fillRect(armrest, 0, w - armrest, h)
  ctx.strokeRect(armrest, 0, w - armrest, h)
  // Backrest
  ctx.beginPath()
  ctx.moveTo(armrest, backrest)
  ctx.lineTo(w, backrest)
  ctx.stroke()
  // Center divider
  ctx.beginPath()
  ctx.moveTo((w + armrest) / 2, 0)
  ctx.lineTo((w + armrest) / 2, h)
  ctx.stroke()
  // Shadow
  ctx.strokeStyle = MAIN_SHAPE_SHADOW_COLOR
  ctx.lineWidth = SHADOW_WIDTH
  ctx.beginPath()
  ctx.moveTo(armrest + SHADOW_WIDTH - 2, backrest + SHADOW_WIDTH - 2)
  ctx.lineTo(armrest + SHADOW_WIDTH - 2, h - 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(armrest + SHADOW_WIDTH - 2, backrest + SHADOW_WIDTH - 2)
  ctx.lineTo(w - 2, backrest + SHADOW_WIDTH - 2)
  ctx.stroke()
}

function drawShapeA2R(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backrest: number,
  armrest: number
) {
  ctx.fillStyle = MAIN_SHAPE_COLOR
  // Main seating area
  ctx.fillRect(0, 0, w - armrest, h)
  ctx.strokeRect(0, 0, w - armrest, h)
  // Right armrest
  ctx.fillRect(w - armrest, 0, armrest, h)
  ctx.strokeRect(w - armrest, 0, armrest, h)
  // Backrest
  ctx.beginPath()
  ctx.moveTo(0, backrest)
  ctx.lineTo(w - armrest, backrest)
  ctx.stroke()
  // Center divider
  ctx.beginPath()
  ctx.moveTo((w - armrest) / 2, 0)
  ctx.lineTo((w - armrest) / 2, h)
  ctx.stroke()
  // Shadow
  ctx.strokeStyle = MAIN_SHAPE_SHADOW_COLOR
  ctx.lineWidth = SHADOW_WIDTH
  ctx.beginPath()
  ctx.moveTo(2, backrest + SHADOW_WIDTH - 2)
  ctx.lineTo(w - armrest - 2, backrest + SHADOW_WIDTH - 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(w - armrest - SHADOW_WIDTH + 2, backrest + SHADOW_WIDTH - 2)
  ctx.lineTo(w - armrest - SHADOW_WIDTH + 2, h - 2)
  ctx.stroke()
}

function drawShapeWithBothArmrests(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backrest: number,
  armrest: number
) {
  ctx.fillStyle = MAIN_SHAPE_COLOR
  // Full shape
  ctx.fillRect(0, 0, w, h)
  ctx.strokeRect(0, 0, w, h)
  // Left armrest divider
  ctx.beginPath()
  ctx.moveTo(armrest, 0)
  ctx.lineTo(armrest, h)
  ctx.stroke()
  // Right armrest divider
  ctx.beginPath()
  ctx.moveTo(w - armrest, 0)
  ctx.lineTo(w - armrest, h)
  ctx.stroke()
  // Backrest (between armrests)
  ctx.beginPath()
  ctx.moveTo(armrest, backrest)
  ctx.lineTo(w - armrest, backrest)
  ctx.stroke()
  // Center divider
  ctx.beginPath()
  ctx.moveTo(w / 2, 0)
  ctx.lineTo(w / 2, h)
  ctx.stroke()
  // Shadow
  ctx.strokeStyle = MAIN_SHAPE_SHADOW_COLOR
  ctx.lineWidth = SHADOW_WIDTH
  ctx.beginPath()
  ctx.moveTo(armrest + 2, backrest + SHADOW_WIDTH - 2)
  ctx.lineTo(w - armrest - 2, backrest + SHADOW_WIDTH - 2)
  ctx.stroke()
}

function drawShape(ctx: CanvasRenderingContext2D, shape: KonvaShape) {
  const dims = shape.attrs.originalSofaForm?.dimensions
  const type = (shape.attrs.type || "E").toUpperCase()

  // Read dimension parameters from shape data, matching the shop's pattern:
  // shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH
  // shapeArmrestWidth = armrestWidth ?? ARMS_REST_WIDTH
  const backrest = dims?.backrest_width ?? BACK_REST_WIDTH
  const originalArmrest = dims?.armrest_width ?? ARMS_REST_WIDTH
  const armrestOverride = shape.attrs.new_armrest_width
  const armrest = armrestOverride ?? originalArmrest

  // Get base width/height from originalWidth/originalHeight
  const baseW = shape.attrs.originalWidth || shape.attrs.width || 100
  const baseH = shape.attrs.originalHeight || shape.attrs.height || 80

  // For armrest shapes (A2L, A2R, etc.), the shop adjusts width when armrest is overridden:
  // shapeWidth = width + armOver - armrestWidth
  const isArmrestL =
    type.startsWith("A") && type.endsWith("L") && !type.startsWith("AR")
  const isArmrestR =
    type.startsWith("A") && type.endsWith("R") && !type.startsWith("AR")
  const hasBothArmrests =
    type === "SOFA2" || type === "SOFA1" || type === "SOFA3" ||
    type === "FOTEL" || type.startsWith("SOFA")

  let w = baseW
  let h = baseH
  if ((isArmrestL || isArmrestR || hasBothArmrests) && armrestOverride != null) {
    w = baseW + armrestOverride - originalArmrest
  }

  const x = shape.attrs.x || 0
  const y = shape.attrs.y || 0
  const rotation = shape.attrs.rotation || 0

  ctx.save()
  ctx.translate(x, y)

  if (rotation !== 0) {
    ctx.translate(w / 2, h / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-w / 2, -h / 2)
  }

  ctx.strokeStyle = STROKE_COLOR
  ctx.lineWidth = 1

  if (type === "CORNERL" || type === "CORNERCUTL" || type === "CORNERROUNDEDL") {
    drawShapeCornerL(ctx, w, h, backrest)
  } else if (type === "CORNERR" || type === "CORNERCUTR" || type === "CORNERROUNDEDR") {
    drawShapeCornerR(ctx, w, h, backrest)
  } else if (isArmrestL) {
    drawShapeA2L(ctx, w, h, backrest, armrest)
  } else if (isArmrestR) {
    drawShapeA2R(ctx, w, h, backrest, armrest)
  } else if (hasBothArmrests) {
    drawShapeWithBothArmrests(ctx, w, h, backrest, armrest)
  } else {
    // Default: simple element (E, OA, PUF, etc.)
    drawShapeE(ctx, w, h, backrest)
  }

  ctx.restore()
}

// --- SofaSetCanvas component ---

interface SofaSetCanvasProps {
  shapes: KonvaShape[]
  maxWidth?: number
  maxHeight?: number
}

const SofaSetCanvas: React.FC<SofaSetCanvasProps> = ({
  shapes,
  maxWidth = 400,
  maxHeight = 250,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || shapes.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Compute bounding box of all shapes
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    for (const shape of shapes) {
      const x = shape.attrs.x || 0
      const y = shape.attrs.y || 0
      const { w, h } = getShapeSize(shape)
      // Account for rotation: use max(w,h) as conservative bound
      const rotation = shape.attrs.rotation || 0
      let bw = w,
        bh = h
      if (rotation === 90 || rotation === 270) {
        bw = h
        bh = w
      }
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + bw)
      maxY = Math.max(maxY, y + bh)
    }

    const contentW = maxX - minX
    const contentH = maxY - minY
    if (contentW <= 0 || contentH <= 0) return

    // Calculate scale to fit in display area
    const scaleX = (maxWidth - CANVAS_PADDING * 2) / contentW
    const scaleY = (maxHeight - CANVAS_PADDING * 2) / contentH
    const scale = Math.min(scaleX, scaleY, 1.5) // Cap at 1.5x to avoid blurry upscaling

    const canvasW = Math.ceil(contentW * scale + CANVAS_PADDING * 2)
    const canvasH = Math.ceil(contentH * scale + CANVAS_PADDING * 2)

    // Set canvas size (use devicePixelRatio for sharp rendering)
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasW * dpr
    canvas.height = canvasH * dpr
    canvas.style.width = `${canvasW}px`
    canvas.style.height = `${canvasH}px`

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasW, canvasH)

    // Translate to center content and apply scale
    ctx.save()
    ctx.translate(CANVAS_PADDING, CANVAS_PADDING)
    ctx.scale(scale, scale)
    ctx.translate(-minX, -minY)

    // Draw all shapes
    for (const shape of shapes) {
      drawShape(ctx, shape)
    }

    ctx.restore()
  }, [shapes, maxWidth, maxHeight])

  useEffect(() => {
    draw()
  }, [draw])

  if (shapes.length === 0) return null

  return (
    <canvas
      ref={canvasRef}
      className="block"
      style={{ maxWidth: "100%" }}
    />
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
    <div className="bg-gray-50 px-4 py-4 sm:px-6">
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

              {/* Right column: Canvas rendering of shapes */}
              <div className="flex items-start justify-center">
                <div className="bg-white p-3 rounded border border-gray-100">
                  {comboShapes.length > 0 ? (
                    <SofaSetCanvas shapes={comboShapes} />
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
