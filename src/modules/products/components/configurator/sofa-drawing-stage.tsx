"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import { Stage, Layer, Rect, Group, Circle, Image as KonvaImage } from "react-konva"
import useImage from "use-image"
import Konva from "konva"

import {
  getClientRect,
  recursiveGroupMatchingFunction,
  drawMetricLinesForGroups,
} from "@configurator/SofaDrawingElements/utils"
import {
  GREEN_SHAPE_COLOR,
  MAIN_SHAPE_COLOR,
  TABLE_COLOR,
} from "@configurator/SofaDrawingElements/SofaElements/constants"
import type { SofaFormExtended } from "@configurator/lib/types"
import { useConfigurator } from "@configurator/context/configurator-context"

import {
  A2L, A2R, A3L, A3R,
  CORNERL, CORNERR,
  COMPOSITE,
  E,
  LCHL, LCHR,
  OA,
  OTT1L, OTT1R,
  PUF,
  ROUND,
  FOTEL,
  SCHEZLONG,
  SLEEPL, SLEEPR,
  SOFA2,
  WITHBED,
  TABLE,
  TABLEMOON,
  TABLE2MOON,
  A1L, A1R,
  A1WEAVEL, A1WEAVER,
  A1ROUNDEDL, A1ROUNDEDR,
  ARM,
  ARCHCORNERL, ARCHCORNERR,
  CORNERROUNDEDL, CORNERROUNDEDR,
  CORNERCUTL,
  LCHOUTERL, LCHOUTERR,
  POLYGONCONERL, POLYGONCONERR,
  OTKL, OTKR,
  OTKFULLPILLOWL, OTKFULLPILLOWR,
  SOFA1, SOFA3,
  ANGLECORNER,
  ANGLECORNERL, ANGLECORNERR, ANGLECORNERLR,
  A3PL, A3UL, A3PR, A3UR,
  OA3, OA3P, OAU3,
  SOFA3U, SOFA3P,
  EP,
  OAU,
  OAPP,
  A1PL, A1PR,
  A2UL, A2UR,
  A2PPL, A2PPR,
  FOTELP,
  SOFA2PP,
  OTTP1L, OTTP1R,
  OTKCL, OTKCR,
  OTKCPL, OTKCPR,
  LCHOUTERPL, LCHOUTERPR,
  LCHOUTERFULL, LCHOUTERFULLP,
  EALEGA, ELEGA, EPLEGA,
  A1LOPENEND, A1ROPENEND,
  A1ALEGAL, A1ALEGAR,
  A1LEGAL, A1LEGAR,
  A1PLEGAL, A1PLEGAR,
  FOTELALEGA, FOTELLEGA, FOTELPLEGA,
  EMANYPILLOWSQ,
  OAUSQ, OAUPSQ,
  A2USQL, A2USQR,
  A2UPSQL, A2UPSQR,
  EMANYPILLOWSQL, EMANYPILLOWSQR,
  AUFULLSQ, AUPFULLSQ,
  AUFULLMANYPILLOWSQ,
  EDOUBLEA, OADOUBLEAA,
  A1DOUBLEAL, A1DOUBLEAR,
  A2DOUBLEAAL, A2DOUBLEAAR,
  FOTELDOUBLEA,
  SOFA2DOUBLEA,
  OAMANYPILLOW,
  EMANYPILLOWL, EMANYPILLOWR,
  A2MANYPILLOWL, A2MANYPILLOWR,
  SOFA2MANYPILLOW,
  ESQ,
  A1SQL, A1SQR,
  FOTELSQ,
  LCHOUTERMANYPILLOW,
  LCHOUTERPINCURVEL, LCHOUTERPINCURVER,
  LCHOUTERDOUBLEAL, LCHOUTERDOUBLEAR,
  EMANYPILLOW,
  LCHOUTERMANYPILLOWSL, LCHOUTERMANYPILLOWSR,
  ANGLECORNERLCHL, ANGLECORNERLCHR,
  ANGLECORNERFLAT, ANGLECORNERFLATMANYPILLOW,
  ANGLECORNERLCHPL, ANGLECORNERLCHPR,
  ANGLECORNERLCHMANYPILLOWL, ANGLECORNERLCHMANYPILLOWR,
  POLYGONLCHL, POLYGONLCHR,
  POLYGONLCHCORNER, POLYGONLCHCORNERMANYPILLOW,
  POLYGONLCHMANYPILLOWL, POLYGONLCHMANYPILLOWR,
  OTKCMANYPILLOWL, OTKCMANYPILLOWR,
  OTTCURVEFULLINSIDEMANYPILLOWL, OTTCURVEFULLINSIDEMANYPILLOWR,
  SQUARESQAA,
} from "@configurator/SofaDrawingElements/SofaElements"

// ============================================================
// Shape element map — keyed by sofaForm.type string
// ============================================================
const sofaShapeElements: Record<string, React.ComponentType<any>> = {
  A2L, A2R, A3L, A3R,
  CORNERL, CORNERR,
  COMPOSITE,
  E,
  FOTEL,
  LCHL, LCHR,
  OA,
  OTT1L, OTT1R,
  PUF,
  ROUND,
  SCHEZLONG,
  SLEEPL, SLEEPR,
  SOFA2,
  WITHBED,
  TABLE,
  TABLEMOON,
  TABLE2MOON,
  A1L, A1R,
  A1WEAVEL, A1WEAVER,
  A1ROUNDEDL, A1ROUNDEDR,
  ARM,
  ARCHCORNERL, ARCHCORNERR,
  CORNERROUNDEDL, CORNERROUNDEDR,
  CORNERCUTL,
  LCHOUTERL, LCHOUTERR,
  POLYGONCONERL, POLYGONCONERR,
  OTKFULLPILLOWL, OTKFULLPILLOWR,
  OTKL, OTKR,
  SOFA1, SOFA3,
  ANGLECORNER,
  ANGLECORNERL, ANGLECORNERR, ANGLECORNERLR,
  A3PL, A3UL, A3PR, A3UR,
  OA3, OA3P, OAU3,
  SOFA3P, SOFA3U,
  EP,
  OAU,
  OAPP,
  A1PL, A1PR,
  A2UL, A2UR,
  A2PPL, A2PPR,
  FOTELP,
  SOFA2PP,
  OTTP1L, OTTP1R,
  OTKCL, OTKCR,
  OTKCPL, OTKCPR,
  LCHOUTERPL, LCHOUTERPR,
  LCHOUTERFULL, LCHOUTERFULLP,
  EALEGA, ELEGA, EPLEGA,
  A1LOPENEND, A1ROPENEND,
  A1ALEGAL, A1ALEGAR,
  A1LEGAL, A1LEGAR,
  A1PLEGAL, A1PLEGAR,
  FOTELALEGA, FOTELLEGA, FOTELPLEGA,
  EMANYPILLOWSQ,
  OAUSQ, OAUPSQ,
  A2USQL, A2USQR,
  A2UPSQL, A2UPSQR,
  EMANYPILLOWSQL, EMANYPILLOWSQR,
  AUFULLSQ, AUPFULLSQ,
  AUFULLMANYPILLOWSQ,
  EDOUBLEA, OADOUBLEAA,
  A1DOUBLEAL, A1DOUBLEAR,
  A2DOUBLEAAL, A2DOUBLEAAR,
  FOTELDOUBLEA,
  SOFA2DOUBLEA,
  OAMANYPILLOW,
  EMANYPILLOWL, EMANYPILLOWR,
  A2MANYPILLOWL, A2MANYPILLOWR,
  SOFA2MANYPILLOW,
  ESQ,
  A1SQL, A1SQR,
  FOTELSQ,
  LCHOUTERMANYPILLOW,
  LCHOUTERPINCURVEL, LCHOUTERPINCURVER,
  LCHOUTERDOUBLEAL, LCHOUTERDOUBLEAR,
  EMANYPILLOW,
  LCHOUTERMANYPILLOWSL, LCHOUTERMANYPILLOWSR,
  ANGLECORNERLCHL, ANGLECORNERLCHR,
  ANGLECORNERFLAT, ANGLECORNERFLATMANYPILLOW,
  ANGLECORNERLCHPL, ANGLECORNERLCHPR,
  ANGLECORNERLCHMANYPILLOWL, ANGLECORNERLCHMANYPILLOWR,
  POLYGONLCHL, POLYGONLCHR,
  POLYGONLCHCORNER, POLYGONLCHCORNERMANYPILLOW,
  POLYGONLCHMANYPILLOWL, POLYGONLCHMANYPILLOWR,
  OTKCMANYPILLOWL, OTKCMANYPILLOWR,
  OTTCURVEFULLINSIDEMANYPILLOWL, OTTCURVEFULLINSIDEMANYPILLOWR,
  SQUARESQAA,
}

// ============================================================
// Local Konva helpers (not yet in B2B utils)
// ============================================================

/** Returns all sofa_shape_group nodes in the layer, excluding COMPOSITE children. */
function getSofaShapesInLayer(layer: any): any[] {
  return layer.find(".sofa_shape_group").filter((group: any) => {
    return group.parent?.attrs?.type !== "COMPOSITE"
  })
}

/**
 * Finds connectors on the dragged target that match connectors on a drop group,
 * respecting the already-connected state of each group.
 */
function findMatchingConnectors(
  targetConnectors: any[],
  dropConnectors: any[],
  target: any,
  group: any
): any[] {
  const matchingConnectors: any[] = []
  for (const targetConnector of targetConnectors) {
    for (const dropConnector of dropConnectors) {
      if (
        targetConnector.shapeType === "PUF" ||
        dropConnector.shapeType === "PUF-RECEIVING"
      ) {
        // PUF connectors — not handled for snap-to-grid
        continue
      } else if (
        targetConnector.shapeType !== "PUF" &&
        targetConnector.shapeType !== "PUF-RECEIVING" &&
        dropConnector.shapeType !== "PUF-RECEIVING" &&
        dropConnector.shapeType !== "PUF"
      ) {
        if (
          targetConnector.type === "left" &&
          dropConnector.type === "right"
        ) {
          if (group.attrs.connected?.right) continue
          matchingConnectors.push({ target: targetConnector, drop: dropConnector })
        }
        if (
          targetConnector.type === "right" &&
          dropConnector.type === "left"
        ) {
          if (group.attrs.connected?.left) continue
          matchingConnectors.push({ target: targetConnector, drop: dropConnector })
        }
      }
    }
  }
  return matchingConnectors
}

/**
 * Groups all sofa shapes on the layer by physical intersection,
 * then merges overlapping groups recursively.
 * Returns connected groups ordered left-to-right.
 */
function generateConnectedGroupsWithScale(
  layer: any,
  scale: number,
  target: any
): any[][] {
  let groupedGroups: any[][] = []
  let allShapes = getSofaShapesInLayer(layer)

  if (target) {
    allShapes = allShapes.filter((group: any) => group._id !== target._id)
  }

  allShapes.forEach((group: any) => {
    const currentGroup: any[] = [group]
    allShapes.forEach((secondary: any) => {
      if (group.attrs.id === secondary.attrs.id) return
      const overlapping = Konva.Util.haveIntersection(
        group.getClientRect(),
        secondary.getClientRect()
      )
      if (overlapping) currentGroup.push(secondary)
    })
    groupedGroups.push(currentGroup)
  })

  const finalGroupedGroups = recursiveGroupMatchingFunction(groupedGroups)

  // Order each group left-to-right; split out unconnected modules as separate groups
  const correctOrder = finalGroupedGroups.flatMap((group: any[]) => {
    if (group.length <= 1) return [group]

    const first = group.find((g: any) => {
      return g.attrs.connected?.right && !g.attrs.connected?.left
    })
    if (!first) return [group]

    const orderedGroup: any[] = [first]
    let current = first
    while (current) {
      const next = group.find(
        (g: any) => g.attrs.connected?.left === current._id
      )
      if (!next) break
      orderedGroup.push(next)
      current = next
    }

    if (orderedGroup.length !== group.length) {
      // Some modules overlap the connected chain but aren't part of it.
      // Separate them into individual groups so they don't break ordering.
      const unconnected = group.filter((g) => !orderedGroup.includes(g))
      return [orderedGroup, ...unconnected.map((m) => [m])]
    }
    return [orderedGroup]
  })

  return correctOrder
}

// ============================================================
// Props
// ============================================================

export interface SofaShapeItem {
  id: string
  sofaForm: SofaFormExtended
}

export interface SofaDrawingStageProps {
  /** Array of sofa shape items to render */
  sofaShapes: SofaShapeItem[]
  /** Called when a shape is deleted, with its id */
  onSofaDelete: (id: string) => void
  /** Called when connected groups change (for external state sync) */
  onCombinationsChange?: (groups: any[][]) => void
  /** Konva scale factor applied to the layer */
  scale: number
  /** Whether to show rotate/delete action buttons */
  showButtons: boolean
  /** Whether to show metric dimension arrows */
  showArrows: boolean
  /** Whether to show background grid */
  showGrid: boolean
  /** Ref to the parent container div — used for sizing the canvas */
  parentRef: React.RefObject<HTMLDivElement>
}

// ============================================================
// Component
// ============================================================

const SofaDrawingStage = ({
  parentRef,
  sofaShapes,
  onSofaDelete,
  onCombinationsChange,
  scale,
  showButtons,
  showArrows,
  showGrid,
}: SofaDrawingStageProps) => {
  const [rotateIcon] = useImage("/svg_icons/arrow-rotate-right-solid.svg")
  const [trashIcon] = useImage("/svg_icons/trash-solid.svg")

  const unScale = (value: number) => value / scale

  // ---- Canvas sizing ----
  const [height, setHeight] = useState(
    parentRef.current ? parentRef.current.offsetHeight : 400
  )
  const [width, setWidth] = useState(
    parentRef.current ? parentRef.current.offsetWidth : 0
  )

  // ---- Interaction state ----
  const [activeSofaShape, setActiveSofaShape] = useState<any>(null)
  const [dragTargetShape, setDragTargetShape] = useState<any>(null)
  const [connectedGroupsInStage, setConnectedGroupsInStage] = useState<any[][]>([])

  // ---- Refs ----
  const stageRef = React.useRef<any>(null)
  const layerRef = React.useRef<any>(null)
  const gridLayerRef = React.useRef<any>(null)

  const stage = stageRef.current
  const layer = layerRef.current
  const gridLayer = gridLayerRef.current

  // ---- Drop zones ----
  const [dropZones, setDropZones] = useState<any[]>([])
  const [dragStartPosition, setDragStartPosition] = useState<any>(null)
  let dropzoneObject: any = null

  // ---- Track container size (width varies by layout, height by breakpoint) ----
  useEffect(() => {
    const el = parentRef.current
    if (!el) return

    const update = () => {
      setWidth(el.offsetWidth)
      if (el.offsetHeight > 0) setHeight(el.offsetHeight)
    }

    const observer = new ResizeObserver(() => update())
    observer.observe(el)
    update()

    return () => observer.disconnect()
  }, [])

  // ---- Notify parent of combination changes ----
  useEffect(() => {
    if (onCombinationsChange) {
      const timer = setTimeout(() => {
        onCombinationsChange(connectedGroupsInStage)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [connectedGroupsInStage, onCombinationsChange])

  // ---- Stage coordinate helpers ----
  const centerX = unScale(width / 2)
  const centerY = unScale(height / 2)

  let stageRect: any
  let viewRect: any
  let fullRect: any

  if (stage) {
    stageRect = {
      x1: 0,
      y1: 0,
      x2: stage.width(),
      y2: stage.height(),
      offset: {
        x: unScale(stage.position().x),
        y: unScale(stage.position().y),
      },
    }
    viewRect = {
      x1: -stageRect.offset.x,
      y1: -stageRect.offset.y,
      x2: unScale(width) - stageRect.offset.x,
      y2: unScale(height) - stageRect.offset.y,
    }
    fullRect = {
      x1: Math.min(stageRect.x1, viewRect.x1),
      y1: Math.min(stageRect.y1, viewRect.y1),
      x2: Math.max(stageRect.x2, viewRect.x2),
      y2: Math.max(stageRect.y2, viewRect.y2),
    }
  }

  // Compute armrest width overrides from selected additional components
  const { state: configuratorState } = useConfigurator()
  const armrestWidthArray = useMemo(() => {
    return (configuratorState?.selectedAdditionalComponents ?? [])
      .filter((component: any) => component?.dimensions?.armrest_width != null)
      .map((component: any) => ({
        id: component.id,
        groupCode: component.groupCode,
        armrestWidth: component.dimensions.armrest_width,
        coveredSide: component.dimensions?.covered_side,
      }))
  }, [configuratorState?.selectedAdditionalComponents])

  // ---- Compute initial positions for shapes (memoized to avoid O(n²) Konva DOM walks) ----
  const modifiedSofaShapes = useMemo(() => {
    const itemsWithOffsets: any[] = []
    for (const item of sofaShapes) {
      itemsWithOffsets.push({
        id: item.id,
        x: (item.sofaForm as any)?.xOriginal ?? 50 * scale,
        y: (item.sofaForm as any)?.yOriginal ?? 50 * scale,
        width: item.sofaForm ? item.sofaForm.dimensions.width : 50,
        height: item.sofaForm ? item.sofaForm.dimensions.length ?? item.sofaForm.dimensions.height : 50,
        draggable: true,
        verticalMetric: false,
        horizontalMetric: false,
        rotation: (item.sofaForm as any)?.rotationOriginal ?? 0,
        sofaForm: item.sofaForm ?? null,
      })
    }

    // ---- Adjust positions to avoid initial collisions ----

    // Track positions of already-placed items for batch collision detection
    const placedItems: Array<{ x: number; y: number; width: number; height: number }> = []

    // Simple rect intersection check (no Konva dependency)
    const rectsOverlap = (
      r1: { x: number; y: number; width: number; height: number },
      r2: { x: number; y: number; width: number; height: number }
    ) => {
      return !(
        r1.x + r1.width <= r2.x ||
        r2.x + r2.width <= r1.x ||
        r1.y + r1.height <= r2.y ||
        r2.y + r2.height <= r1.y
      )
    }

    return itemsWithOffsets.map((sofaObject) => {
      // Check if this shape already exists on the Konva layer
      const existingShape = layer
        ? getSofaShapesInLayer(layer).find(
            (group: any) => group.attrs.id === sofaObject.id
          )
        : null

      if (existingShape) {
        // Already rendered — keep its current position
        const pos = { x: existingShape.attrs.x, y: existingShape.attrs.y }
        placedItems.push({
          x: pos.x,
          y: pos.y,
          width: sofaObject.width,
          height: sofaObject.height,
        })
        return { ...sofaObject, x: pos.x, y: pos.y }
      }

      // New module — find non-overlapping position
      let candidateX = sofaObject.x
      let candidateY = sofaObject.y
      const startX = candidateX
      const stageW = width / scale  // Convert stage dimensions to match item coordinate space
      const stageH = height / scale

      // Collect existing rects from Konva layer
      const layerRects: Array<{ x: number; y: number; width: number; height: number }> = []
      if (layer) {
        getSofaShapesInLayer(layer).forEach((group: any) => {
          const rect = group.getClientRect()
          layerRects.push({
            x: rect.x / scale,
            y: rect.y / scale,
            width: rect.width / scale,
            height: rect.height / scale,
          })
        })
      }

      for (let attempt = 0; attempt < 100; attempt++) {
        const candidate = {
          x: candidateX,
          y: candidateY,
          width: sofaObject.width,
          height: sofaObject.height,
        }

        const hasOverlap =
          placedItems.some((placed) => rectsOverlap(candidate, placed)) ||
          layerRects.some((rect) => rectsOverlap(candidate, rect))

        if (!hasOverlap) break

        // Shift right
        candidateX += 80
        // If going off-screen, wrap to next row
        if (candidateX + sofaObject.width > stageW) {
          candidateX = startX
          candidateY += 80
        }
        // If also going off-screen vertically, stop trying
        if (candidateY + sofaObject.height > stageH) {
          break
        }
      }

      placedItems.push({
        x: candidateX,
        y: candidateY,
        width: sofaObject.width,
        height: sofaObject.height,
      })
      return { ...sofaObject, x: candidateX, y: candidateY }
    })
  }, [sofaShapes, layer, scale, width, height])

  // ---- Drop zone generation ----
  const generateAllAvailableDropZones = (layer: any, target: any) => {
    if (!target || target.attrs.name !== "sofa_shape_group") return []

    let allPossibleDropZones: any[] = []
    const shapes = getSofaShapesInLayer(layer).filter(
      (group: any) => group._id !== target._id
    )

    shapes.forEach((group: any) => {
      let currentZones: any[] = []
      const matchingConnectors = findMatchingConnectors(
        target.attrs.connectors,
        group.attrs.connectors,
        target,
        group
      )

      function movePointByRotation(
        point: { x: number; y: number },
        rotationAngle: number,
        distance: number
      ) {
        const angleInRadians = (rotationAngle * Math.PI) / 180
        return {
          x: point.x + distance * Math.cos(angleInRadians),
          y: point.y + distance * Math.sin(angleInRadians),
        }
      }

      for (const connector of matchingConnectors) {
        const transformedPoint = group
          .getTransform()
          .point({ x: connector.drop.x, y: connector.drop.y })

        const dropPointRotation =
          (group.attrs.rotation ?? 0) + connector.drop.rotation

        let rotationForTestPoint =
          connector.drop.type === "left"
            ? dropPointRotation - 180
            : dropPointRotation

        const testPoint = movePointByRotation(
          transformedPoint,
          rotationForTestPoint,
          target.attrs.width
        )

        const isOverlapingGroup = shapes.find((groupToCheck: any) => {
          return Konva.Util.haveIntersection(
            { x: testPoint.x - 1, y: testPoint.y - 1, width: 2, height: 2 },
            getClientRect(groupToCheck, {
              padding: 1,
              roundValues: true,
              relativeTo: layer,
            })
          )
        })

        if (!isOverlapingGroup) {
          const clone = target.clone({
            x: transformedPoint.x,
            y: transformedPoint.y,
            name: "dropzone",
            opacity: 0.4,
            rotation: dropPointRotation - connector.target.rotation,
            offsetX: connector.target.x,
            offsetY: connector.target.y,
          })
          clone.attrs.groupToConnect = group
          clone.attrs.groupMatchedConnector = connector
          currentZones.push(clone)
        }
      }

      allPossibleDropZones = [...allPossibleDropZones, ...currentZones]
    })

    return allPossibleDropZones
  }

  // ---- Action button positioning ----
  const showActionButtons = (target?: any) => {
    if (!layer) return
    const clientRect = getClientRect(target ?? activeSofaShape, {
      roundValues: true,
      relativeTo: layer,
    })
    layer.findOne(".action_buttons")?.position(clientRect)
    layer.findOne(".action_buttons")?.visible(true).moveToTop()
  }

  // ---- Delete handler ----
  const onDelete = useCallback((_e: any) => {
    if (!activeSofaShape || !layer) return
    layer.findOne(".action_buttons")?.visible(false)
    disconnectShape(activeSofaShape)
    const deletedId = activeSofaShape.attrs.id
    activeSofaShape.destroy()
    const connectedGroups = generateConnectedGroupsWithScale(layer, scale, null)
    setConnectedGroupsInStage(connectedGroups)
    setActiveSofaShape(null)
    onSofaDelete(deletedId)
  }, [activeSofaShape, layer, scale, onSofaDelete])

  // ---- Click handler ----
  const handleClick = (e: any) => {
    let target = e.target.getParent()
    if (target.getParent()?.attrs?.type === "COMPOSITE") {
      target = target.getParent()
    }
    if (target.attrs.name === "sofa_shape_group") {
      setActiveSofaShape(target)
      showActionButtons(target)
    } else {
      if (
        target.attrs.name === "rotate_button" ||
        target.attrs.name === "delete_button"
      ) {
        return
      }
      layer?.findOne(".action_buttons")?.visible(false)
    }
  }

  // ---- Disconnect shape helper ----
  const disconnectShape = (shape: any) => {
    if (!layer) return
    if (shape.attrs.connected?.left) {
      const grToUnconnect = getSofaShapesInLayer(layer).find(
        (group: any) => group._id === shape.attrs.connected.left
      )
      if (grToUnconnect?.attrs?.connected) {
        grToUnconnect.attrs.connected.right = null
      }
    }
    if (shape.attrs.connected?.right) {
      const grToUnconnect = getSofaShapesInLayer(layer).find(
        (group: any) => group._id === shape.attrs.connected.right
      )
      if (grToUnconnect?.attrs?.connected) {
        grToUnconnect.attrs.connected.left = null
      }
    }
  }

  // ---- Drag start ----
  const handleDragStart = (e: any) => {
    disconnectShape(e.target)
    setDragTargetShape(e.target)
    setDragStartPosition(e.target.absolutePosition())
    const tempIndex = getSofaShapesInLayer(layer).length + 1
    e.target.zIndex(tempIndex)
    setActiveSofaShape(e.target)
    layer.findOne(".action_buttons")?.visible(false)
    dropzoneObject = null

    const allDropZones = generateAllAvailableDropZones(layer, e.target)
    layer.find(".dropzone").forEach((l: any) => l.destroy())
    allDropZones?.forEach((zone: any) => {
      layer.add(zone)
      zone.moveToBottom()
    })
    setDropZones(allDropZones)
  }

  // ---- Drag move ----
  const handleDragMove = (e: any) => {
    updateMetricLines()
    const target = e.target
    target.moveToTop()
    showActionButtons()

    let dropzoneObjectDist: number | undefined
    dropzoneObject = null

    dropZones.forEach((zone: any) => {
      const targetRec = target.getClientRect()
      const zoneRec = zone.getClientRect()
      const overlaping = Konva.Util.haveIntersection(targetRec, zoneRec)

      if (overlaping) {
        zone.opacity(0.6)
        zone.find(".sofa_shape").forEach((element: any) => {
          element.fill(GREEN_SHAPE_COLOR)
        })

        const targetCenter = {
          x: targetRec.x + targetRec.width / 2,
          y: targetRec.y + targetRec.height / 2,
        }
        const zoneCenter = {
          x: zoneRec.x + zoneRec.width / 2,
          y: zoneRec.y + zoneRec.height / 2,
        }
        const distance = Math.sqrt(
          Math.pow(targetCenter.x - zoneCenter.x, 2) +
            Math.pow(targetCenter.y - zoneCenter.y, 2)
        )

        if (dropzoneObjectDist === undefined || distance < dropzoneObjectDist) {
          dropzoneObjectDist = distance
          dropzoneObject = zone
        }
      } else {
        zone.find(".sofa_shape").forEach((element: any) => {
          element.fill(MAIN_SHAPE_COLOR)
        })
      }
    })
  }

  // ---- Drag end ----
  const handleDragEnd = (e: any) => {
    setDragTargetShape(null)

    // Find a mirror zone if exists before deleting all zones
    let mirrorZone: any
    if (dropzoneObject) {
      const zonePos = getClientRect(dropzoneObject, {
        roundValues: true,
        relativeTo: layer,
      })
      mirrorZone = layer.find(".dropzone")?.find((l: any) => {
        const lPos = getClientRect(l, { roundValues: true, relativeTo: layer })
        return zonePos.x === lPos.x && zonePos.y === lPos.y && l !== dropzoneObject
      })
    }

    layer.find(".dropzone").forEach((l: any) => l.destroy())
    showActionButtons()

    if (dropzoneObject) {
      const zonePos = getClientRect(dropzoneObject, {
        roundValues: true,
        relativeTo: layer,
      })

      e.target.position({ x: zonePos.x, y: zonePos.y })
      e.target.rotation(dropzoneObject.rotation())

      // Connect groups
      if (!dropzoneObject.attrs.groupToConnect.attrs.connected) {
        dropzoneObject.attrs.groupToConnect.attrs.connected = {}
      }
      dropzoneObject.attrs.groupToConnect.attrs.connected[
        dropzoneObject.attrs.groupMatchedConnector.drop.type
      ] = e.target._id

      e.target.attrs.connected = {
        [dropzoneObject.attrs.groupMatchedConnector.target.type]:
          dropzoneObject.attrs.groupToConnect._id,
      }

      // Connect mirror zone
      if (mirrorZone) {
        if (!mirrorZone.attrs.groupToConnect.attrs.connected) {
          mirrorZone.attrs.groupToConnect.attrs.connected = {}
        }
        mirrorZone.attrs.groupToConnect.attrs.connected[
          mirrorZone.attrs.groupMatchedConnector.drop.type
        ] = e.target._id

        e.target.attrs.connected[
          mirrorZone.attrs.groupMatchedConnector.target.type
        ] = mirrorZone.attrs.groupToConnect._id
      }

      showActionButtons()
    } else {
      e.target.attrs.connected = {}

      // Check if target intersects other shapes
      const targetRect = getClientRect(e.target, {
        roundValues: true,
        relativeTo: layer,
      })

      let shapeIntersection = false
      getSofaShapesInLayer(layer).forEach((group: any) => {
        if (group._id === e.target._id) return
        const groupObject = getClientRect(group, { roundValues: true, relativeTo: layer })
        if (Konva.Util.haveIntersection(targetRect, groupObject)) {
          shapeIntersection = true
        }
      })

      if (shapeIntersection) {
        e.target?.absolutePosition(dragStartPosition)
        const shapeType = e.target.attrs.type
        if (
          shapeType === "TABLE" ||
          shapeType === "TABLEMOON" ||
          shapeType === "TABLE2MOON"
        ) {
          e.target.findOne(".sofa_shape")?.fill(TABLE_COLOR)
        } else {
          e.target.findOne(".sofa_shape")?.fill(MAIN_SHAPE_COLOR)
        }
      }
    }

    const connectedGroups = generateConnectedGroupsWithScale(layer, scale, null)
    setConnectedGroupsInStage(connectedGroups)
  }

  // ---- Metric lines update ----
  // Accepts optional pre-computed groups to avoid a redundant generateConnectedGroupsWithScale call.
  const updateMetricLines = (preComputedGroups?: any[][]) => {
    if (!layer) return
    if (showArrows) {
      const connectedGroups = preComputedGroups
        ?? generateConnectedGroupsWithScale(layer, scale, dragTargetShape)
      layer.find(".metricLine").forEach((l: any) => l.destroy())

      const groupsToRender = dragTargetShape
        ? [...connectedGroups, [dragTargetShape]]
        : connectedGroups

      groupsToRender.forEach((groupOfGroups: any[]) => {
        drawMetricLinesForGroups(groupOfGroups, layer, scale)
      })
    } else {
      layer.find(".metricLine").forEach((l: any) => l.destroy())
    }
  }

  // ---- Effects for metric lines ----
  // sofaShapes is intentionally NOT in deps here: metric-line updates after a shape change are
  // already triggered by connectedGroupsInStage changing in the effect below.
  useEffect(() => {
    if (layer) {
      updateMetricLines()
    }
  }, [showArrows, scale, dragTargetShape, connectedGroupsInStage])

  // ---- Effect for connected groups on shape or armrest changes ----
  // generateConnectedGroupsWithScale is called when shapes or armrest widths change.
  // The metric-lines effect above will fire automatically when connectedGroupsInStage updates.
  useEffect(() => {
    if (layer) {
      const connectedGroups = generateConnectedGroupsWithScale(layer, scale, null)
      setConnectedGroupsInStage(connectedGroups)
    }
  }, [sofaShapes, layer, armrestWidthArray])

  // ---- Grid drawing ----
  const gridStepSize = 40

  const drawGrid = () => {
    if (!gridLayer || !fullRect) return
    gridLayer.find(".gridLine").forEach((l: any) => l.destroy())

    if (showGrid) {
      const xSize = fullRect.x2 - fullRect.x1
      const ySize = fullRect.y2 - fullRect.y1
      const xSteps = Math.round(xSize / gridStepSize)
      const ySteps = Math.round(ySize / gridStepSize)

      for (let i = 0; i <= xSteps; i++) {
        gridLayer.add(
          new Konva.Line({
            x: fullRect.x1 + i * gridStepSize,
            y: fullRect.y1,
            points: [0, 0, 0, ySize],
            stroke: "rgba(0, 0, 0, 0.1)",
            strokeWidth: 1,
            name: "gridLine",
          })
        )
      }

      for (let i = 0; i <= ySteps; i++) {
        gridLayer.add(
          new Konva.Line({
            x: fullRect.x1,
            y: fullRect.y1 + i * gridStepSize,
            points: [0, 0, xSize, 0],
            stroke: "rgba(0, 0, 0, 0.1)",
            strokeWidth: 1,
            name: "gridLine",
          })
        )
      }

      gridLayer.batchDraw()
    }
  }

  useEffect(() => {
    if (layer) {
      drawGrid()
    }
  }, [showGrid, layer, gridLayer, scale])

  // ---- Rotation handler ----
  const handleRotation = (_e: any) => {
    if (!activeSofaShape) return

    const currentPosition = { ...activeSofaShape.getClientRect() }
    const currentCenter = {
      x: currentPosition.x + currentPosition.width / 2,
      y: currentPosition.y + currentPosition.height / 2,
    }

    let rotation = activeSofaShape.rotation()
    rotation = (rotation + 90) % 360
    activeSofaShape.rotation(rotation)

    const newPosition = activeSofaShape.getClientRect()
    const newCenter = {
      x: newPosition.x + newPosition.width / 2,
      y: newPosition.y + newPosition.height / 2,
    }

    activeSofaShape.x(activeSofaShape.x() + currentCenter.x - newCenter.x)
    activeSofaShape.y(activeSofaShape.y() + currentCenter.y - newCenter.y)

    showActionButtons()
    updateMetricLines()
  }

  // ============================================================
  // Build rendered elements (memoized — only recreated when shapes, positions, or display
  // props change; stable keys prevent full unmount/remount on every add).
  // ============================================================
  const modifiedElements = useMemo(() => {
    const elements: React.ReactNode[] = []

    for (const item of modifiedSofaShapes) {
      if (item.sofaForm == null) continue
      const SofaElement = sofaShapeElements[item.sofaForm.type]
      if (!SofaElement) continue

      const dims = item.sofaForm.dimensions

      // Find matching armrest override for this module
      const armrestOverride = armrestWidthArray.find((component: any) =>
        component.groupCode?.endsWith(item.sofaForm?.code)
      )

      elements.push(
        <SofaElement
          key={item.id}
          id={item.id}
          x={item.x}
          y={item.y}
          width={item.width}
          height={item.height}
          draggable={item.draggable}
          verticalMetric={item.verticalMetric}
          horizontalMetric={item.horizontalMetric}
          layer={layer}
          onDelete={onDelete}
          showButtons={showButtons}
          stageWidth={width}
          stageHeight={height}
          originalSofaForm={item.sofaForm}
          armrestWidth={dims.armrest_width}
          armrestWidthOverride={armrestOverride?.armrestWidth}
          backrestWidth={dims.backrest_width}
          mattressWidth={dims.mattress_width}
          mattressLength={dims.mattress_length}
          enabled_connectors={item.sofaForm.enabled_connectors}
          cornerPartLength={dims.corner_part_length}
          cornerRadius={dims.corner_radius}
          rotation={item.rotation}
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
      )
    }

    return elements
  }, [modifiedSofaShapes, layer, onDelete, showButtons, width, height, armrestWidthArray])

  // ============================================================
  // Render
  // ============================================================
  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      style={{ zIndex: 2, position: "relative" }}
    >
      <Layer ref={gridLayerRef} scaleX={scale} scaleY={scale} />
      <Layer
        ref={layerRef}
        scaleX={scale}
        scaleY={scale}
        onDragStart={(e: any) => handleDragStart(e)}
        onDragMove={(e: any) => handleDragMove(e)}
        onDragEnd={(e: any) => handleDragEnd(e)}
        onMouseDown={(e: any) => handleClick(e)}
        onTouchStart={(e: any) => handleClick(e)}
      >
        {/* Transparent hit-target rect so clicks outside shapes can deselect */}
        <Rect x={0} y={0} width={width / scale} height={height / scale} />

        {modifiedElements}

        {showGrid && (
          <Circle
            name="middle_circle"
            x={centerX}
            y={centerY}
            radius={2}
            fill="#D3D3D3"
          />
        )}

        {/* Action buttons (rotate + delete) — shown on active shape */}
        <Group name="action_buttons" visible={false}>
          <Group
            name="rotate_button"
            x={20}
            y={20}
            opacity={0.8}
            onClick={(e: any) => handleRotation(e)}
            onTouchEnd={(e: any) => handleRotation(e)}
          >
            <Circle x={0} y={0} radius={17} fill="white" />
            <KonvaImage x={-11} y={-11} image={rotateIcon} width={20} height={20} />
          </Group>

          <Group
            name="delete_button"
            x={57}
            y={20}
            opacity={0.8}
            onClick={(e: any) => onDelete(e)}
            onTouchEnd={(e: any) => onDelete(e)}
          >
            <Circle x={0} y={0} radius={17} fill="white" />
            <KonvaImage x={-8} y={-11} image={trashIcon} width={17} height={20} />
          </Group>
        </Group>
      </Layer>
    </Stage>
  )
}

export default SofaDrawingStage
