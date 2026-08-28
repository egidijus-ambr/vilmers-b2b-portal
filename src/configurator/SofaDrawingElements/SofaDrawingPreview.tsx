// ================ SOFA DRAWING PREVIEW =================
// Read-only Konva canvas rendering of a sofa combination.
// Shared across projects — do NOT add project-specific
// dependencies (Apollo, MobX, etc.) here.
//
// Supports two modes:
//   1. Live Konva nodes (from interactive configurator)
//   2. Static serialized data (from stored JSON)
// Mode is auto-detected from the combination items.
// ========================================================

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Layer, Stage } from 'react-konva'
import * as SofaElements from './SofaElements'
import { drawMetricLinesForGroups } from './utils'
import { METRIC_SIZE, LABEL_GAP } from './SofaElements/constants'

// X axis: both the left AND right vertical metric lines need overhang room (since the
// right line now mirrors the left one — see MetricLines.tsx), each METRIC_SIZE / 2 +
// LABEL_GAP wide. That bbox comes from computeGroupRectFromAttrs below (nominal
// attrs.width/height), while the actual line/label placement comes from
// measureGroupOfGroups's getClientRect() (rendered pixels, which can include
// shadow/stroke overflow and rounding) — the two rarely agree to the pixel, so on top
// of the exact overhang we add SAFETY_MARGIN slack to avoid clipping either label's
// outer edge. This was previously invisible because only the left line carried an
// overhang; now both sides do, so a budget without slack has zero room for that drift.
const LABEL_OVERHANG_PER_SIDE = METRIC_SIZE / 2 + LABEL_GAP
const METRIC_LABEL_SAFETY_MARGIN = 40
export const LIVE_METRIC_PADDING_X =
  LABEL_OVERHANG_PER_SIDE * 2 + METRIC_LABEL_SAFETY_MARGIN

// Y axis: only the single top horizontal metric line needs room — it extends
// METRIC_SIZE upward from the sofa's top edge; there is no bottom line. This is
// deliberately its own (smaller) budget: reusing the X-axis budget (which exists to
// cover a *pair* of side labels) here would over-reserve vertical space and shrink the
// sofa in fixed-height containers (e.g. the offer diagram, cart item preview) well
// below what LIVE_METRIC_PADDING_X-for-both-axes used to allow.
export const LIVE_METRIC_PADDING_Y = METRIC_SIZE + 20

interface ArmrestWidthOverride {
  armrestWidth: number
  moduleId: string
}

interface SofaDrawingPreviewProps {
  /** Array of Konva group nodes or static shape objects */
  combination: any[]
  /** Ref to the parent container div (used for sizing) */
  parentRef: React.RefObject<HTMLElement>
  /** Scale factor for sofa shapes (default: 1) */
  sofaScale?: number
  /** Armrest width overrides per module */
  armrestWidthOverrides?: ArmrestWidthOverride[]
  /** Callback to receive canvas image data URI after rendering */
  onImage?:
    | ((image: { dataURI: string; width: number; length: number }) => void)
    | null
  /** Horizontal padding reserved for metric lines/labels. Defaults: LIVE_METRIC_PADDING_X for live nodes, 40 for static */
  metricPadding?: number
  /** Vertical padding reserved for metric lines/labels. Defaults: LIVE_METRIC_PADDING_Y for live nodes, 40 for static */
  metricPaddingY?: number
}

// Compute bounding box from shape attrs (works for both live Konva nodes and static data).
// Uses attrs.x/y (local coordinates) rather than getClientRect() (screen coordinates)
// so the result is in the same coordinate space as the rendering code.
function computeGroupRectFromAttrs(shapes: any[], sofaScale: number) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const shape of shapes) {
    const x = shape.attrs?.x || 0
    const y = shape.attrs?.y || 0
    const w = shape.attrs?.originalWidth || shape.attrs?.width || 0
    const extendablePartLength = shape.attrs?.originalSofaForm?.dimensions?.extendable_part_length || 0
    const h = (shape.attrs?.originalHeight || shape.attrs?.height || 0) + extendablePartLength

    // Konva rotates around the Group's (x,y) position (top-left corner).
    // This shifts the visual bounds in screen space — adjust accordingly.
    const rotation =
      (typeof shape.rotation === 'function' ? shape.rotation() : shape.attrs?.rotation) || 0
    const normalizedRotation = ((rotation % 360) + 360) % 360

    let ax = x
    let ay = y
    let dw = w
    let dh = h

    switch (normalizedRotation) {
      case 90:
        ax = x - h
        dw = h
        dh = w
        break
      case 180:
        ax = x - w
        ay = y - h
        break
      case 270:
        ay = y - w
        dw = h
        dh = w
        break
    }

    minX = Math.min(minX, ax)
    minY = Math.min(minY, ay)
    maxX = Math.max(maxX, ax + dw)
    maxY = Math.max(maxY, ay + dh)
  }

  const width = Math.round((maxX - minX) / sofaScale)
  const height = Math.round((maxY - minY) / sofaScale)

  return {
    x: minX / sofaScale,
    y: minY / sofaScale,
    width,
    height,
    center: {
      x: minX / sofaScale + width / 2,
      y: minY / sofaScale + height / 2,
    },
    ranges: { minX, maxX, minY, maxY },
  }
}

const SofaDrawingPreview = ({
  combination,
  parentRef,
  sofaScale = 1,
  armrestWidthOverrides = [],
  onImage = null,
  metricPadding,
  metricPaddingY,
}: SofaDrawingPreviewProps) => {
  const stageRef = useRef<any>(null)
  const [layer, setLayer] = useState<any>(null)
  const layerRef = useCallback((node: any) => {
    if (node) setLayer(node)
  }, [])

  // Detect if items are live Konva nodes or static data
  const isLiveNodes = typeof combination[0]?.findOne === 'function'

  // --- SIZE the canvas according to the parent DIV size
  const [height, setHeight] = useState(
    parentRef.current ? parentRef.current.offsetHeight : 300
  )
  const [width, setWidth] = useState(
    parentRef.current ? parentRef.current.offsetWidth : 300
  )

  const [metricLayers, setMetricLayers] = useState(false)

  // Compute bounding box from attrs (local coordinates) — consistent with rendering
  const groupRect = computeGroupRectFromAttrs(combination, sofaScale)

  useEffect(() => {
    handleResize()
  }, [parentRef])

  const handleResize = () => {
    if (parentRef.current) {
      let height = parentRef.current.offsetHeight
      let width = parentRef.current.offsetWidth
      setHeight(height)
      setWidth(width)

      if (isLiveNodes && layer) {
        drawMetricLinesForShapes()
        setMetricLayers(true)
      }
    }
  }

  useEffect(() => {
    if (isLiveNodes && layer) {
      drawMetricLinesForShapes()
      setMetricLayers(true)
    } else if (!isLiveNodes) {
      // Static mode: mark as ready for image export immediately
      setMetricLayers(true)
    }
  }, [combination, layer])

  // Calculate distance between groups (if they overlap distance should be negative)
  // Move all groups to center
  const centerX = width / 2
  const centerY = height / 2
  const additionalBoundX =
    metricPadding ?? (isLiveNodes ? LIVE_METRIC_PADDING_X : 40)
  const additionalBoundY =
    metricPaddingY ?? (isLiveNodes ? LIVE_METRIC_PADDING_Y : 40)

  let distanceToCenterX = centerX - groupRect.center.x
  let distanceToCenterY = centerY - groupRect.center.y

  // We calculate how much do we need to scale down to fit in the window
  let allScales = [] as any
  if (groupRect.width + additionalBoundX > width) {
    let newScale = width / (groupRect.width + additionalBoundX)
    allScales.push(newScale)
  }
  if (groupRect.height + additionalBoundY > height) {
    let newScale = height / (groupRect.height + additionalBoundY)
    allScales.push(newScale)
  }

  const minScale = allScales.length > 0 ? Math.min(...allScales) : 1
  const scale = minScale

  if (scale < 1) {
    distanceToCenterX = centerX / scale - groupRect.center.x
    distanceToCenterY = centerY / scale - groupRect.center.y
  }

  // ===============================================================
  // RENDER Elements
  let modifiedElements = [] as any
  let n = 0

  for (const item of combination) {
    if (item.attrs?.type != null) {
      // For live nodes, check .findOne; for static data, always proceed
      const hasShape = isLiveNodes ? !!item.findOne('.sofa_shape') : true
      if (hasShape) {
        const actualRotation = isLiveNodes
          ? item.rotation()
          : item.attrs.rotation || 0

        const SofaElement = SofaElements[item.attrs.type]
        if (!SofaElement) {
          n++
          continue
        }

        const dims = item.attrs.originalSofaForm?.dimensions || {}

        modifiedElements.push(
          <SofaElement
            id={item.attrs.id}
            key={n}
            x={item.attrs.x + distanceToCenterX}
            y={item.attrs.y + distanceToCenterY}
            width={item.attrs.originalWidth}
            height={item.attrs.originalHeight}
            draggable={false}
            verticalMetric={false}
            horizontalMetric={false}
            layer={layer}
            onDelete={null}
            showButtons={false}
            scale={scale}
            stageWidth={width}
            stageHeight={height}
            rotation={actualRotation}
            armrestWidth={dims.armrest_width}
            backrestWidth={dims.backrest_width}
            mattressWidth={dims.mattress_width}
            mattressLength={dims.mattress_length}
            enabled_connectors={item.attrs.originalSofaForm?.enabled_connectors}
            cornerPartLength={dims.corner_part_length}
            cornerRadius={dims.corner_radius}
            composition={dims.composition}
            armrestWidthOverride={
              item.attrs.new_armrest_width ??
              armrestWidthOverrides.find(m => m.moduleId === item.attrs.id)
                ?.armrestWidth
            }
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
        )
      }
    }
    n++
  }

  useEffect(() => {
    if (metricLayers && onImage != null && stageRef.current) {
      const uri = stageRef.current.toDataURL()

      const imageObject = {
        dataURI: uri,
        width: groupRect.width,
        length: groupRect.height,
      }

      onImage(imageObject)
    }
  }, [metricLayers])

  // Metric lines only for live Konva nodes
  const drawMetricLinesForShapes = () => {
    if (!isLiveNodes || !layer) return
    layer.find('.metricLine').forEach(l => l.destroy())

    drawMetricLinesForGroups(combination, layer, scale, {
      offsetX: distanceToCenterX,
      offsetY: distanceToCenterY,
    })
  }

  return (
    <Stage ref={stageRef} width={width} height={height} listening={false}>
      <Layer ref={layerRef} scaleX={scale} scaleY={scale}>
        {modifiedElements}
      </Layer>
    </Stage>
  )
}

export default SofaDrawingPreview
