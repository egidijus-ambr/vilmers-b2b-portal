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
import {
  getGroupOfGroupsRectWithScale,
  drawMetricLinesForGroups,
} from './utils'

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
  onImage?: ((image: { dataURI: string; width: number; length: number }) => void) | null
}

// Compute bounding box from static shape data (no Konva API needed)
function computeStaticGroupRect(shapes: any[], sofaScale: number) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const shape of shapes) {
    const x = shape.attrs?.x || 0
    const y = shape.attrs?.y || 0
    const w = shape.attrs?.originalWidth || shape.attrs?.width || 0
    const h = shape.attrs?.originalHeight || shape.attrs?.height || 0
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + w)
    maxY = Math.max(maxY, y + h)
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
}: SofaDrawingPreviewProps) => {
  const stageRef = useRef(null)
  const [layer, setLayer] = useState<any>(null)
  const layerRef = useCallback((node: any) => {
    if (node) setLayer(node)
  }, [])

  // Detect if items are live Konva nodes or static data
  const isLiveNodes = typeof combination[0]?.findOne === 'function'

  // --- SIZE the canvas according to the parent DIV size
  const [height, setHeight] = useState(0)
  const [width, setWidth] = useState(0)

  const [metricLayers, setMetricLayers] = useState(false)

  // Compute bounding box — use Konva API for live nodes, static calc otherwise
  const groupRect = isLiveNodes
    ? getGroupOfGroupsRectWithScale(combination, sofaScale)
    : computeStaticGroupRect(combination, sofaScale)

  // Use ResizeObserver to track container dimensions reliably
  useEffect(() => {
    const container = parentRef.current
    if (!container) return

    const updateDimensions = () => {
      const newWidth = container.offsetWidth
      const newHeight = container.offsetHeight
      if (newWidth > 0 && newHeight > 0) {
        setWidth(newWidth)
        setHeight(newHeight)
      }
    }

    // Initial measurement
    updateDimensions()

    // Observe size changes
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [parentRef])

  // Calculate distance between groups (if they overlap distance should be negative)
  // Move all groups to center
  const centerX = width / 2
  const centerY = height / 2
  const additionalBound = isLiveNodes ? 110 : 40 // Less padding for static (no metric arrows)

  let distanceToCenterX = centerX - groupRect.center.x
  let distanceToCenterY = centerY - groupRect.center.y

  // We calculate how much do we need to scale down to fit in the window
  let allScales = [] as any
  if (groupRect.width + additionalBound > width) {
    let newScale = width / (groupRect.width + additionalBound)
    allScales.push(newScale)
  }
  if (groupRect.height + additionalBound > height) {
    let newScale = height / (groupRect.height + additionalBound)
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
          : (item.attrs.rotation || 0)

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

  // Draw metric lines for live Konva nodes when dimensions are ready
  useEffect(() => {
    if (width === 0 || height === 0) return

    if (isLiveNodes && layer) {
      layer.find('.metricLine').forEach((l: any) => l.destroy())
      drawMetricLinesForGroups(combination, layer, scale, {
        offsetX: distanceToCenterX,
        offsetY: distanceToCenterY,
      })
      setMetricLayers(true)
    } else if (!isLiveNodes) {
      // Static mode: mark as ready for image export immediately
      setMetricLayers(true)
    }
  }, [width, height, combination, layer, isLiveNodes, scale, distanceToCenterX, distanceToCenterY])

  useEffect(() => {
    if (metricLayers && onImage != null && stageRef.current) {
      const uri = (stageRef.current as any).toDataURL()

      const imageObject = {
        dataURI: uri,
        width: groupRect.width,
        length: groupRect.height,
      }

      onImage(imageObject)
    }
  }, [metricLayers, onImage, groupRect.width, groupRect.height])

  // Don't render until we have valid dimensions
  if (width === 0 || height === 0) {
    return null
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
