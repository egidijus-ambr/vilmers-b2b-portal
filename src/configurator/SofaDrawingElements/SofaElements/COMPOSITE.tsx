// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Layer,
  Stage,
  Star,
  Shape,
  Group,
  Line,
  Arrow,
  Label,
  Text,
  Tag,
  Rect,
  Circle,
  Image,
} from 'react-konva'
import { dragBound, haveIntersection } from '../utils'
import {
  ARMS_REST_WIDTH,
  BACK_REST_WIDTH,
  MAIN_SHAPE_COLOR,
  MAIN_SHAPE_SHADOW_COLOR,
  METRIC_SIZE,
  SHADOW_WIDTH,
} from './constants'
import { HorizontalMetric, VerticalMetric } from './MetricLines'
import Konva from 'konva'

import Gizmo from '../Gizmo'

// Dynamic import function for sofa elements
const loadSofaElement = async (type: string) => {
  // Try require first (synchronous - for Node.js or environments where it's available)
  if (typeof require !== 'undefined') {
    try {
      const ShapeImport = require(`./${type}`)
      return {
        default: ShapeImport.default,
        getDimensions: ShapeImport.getDimensions,
      }
    } catch (error) {
      console.warn(
        `require() failed for ${type}, falling back to import.meta.glob:`,
        error.message
      )
      // Fall through to the import.meta.glob approach
    }
  }

  // Fallback to import.meta.glob (asynchronous - for Vite/ES modules)
  try {
    const modules = import.meta.glob('./*.tsx')
    const modulePath = `./${type}.tsx`

    if (modulePath in modules) {
      const ShapeImport = await modules[modulePath]()
      return ShapeImport
    } else {
      console.error(`Module not found: ${modulePath}`)
      return null
    }
  } catch (error) {
    console.error('Error loading sofa element:', error)
    return null
  }
}

export const getDimensions = ({ shapeWidth, shapeHeight, angle }) => {
  return {
    armrestPosition: 'L',
    connectors: [],
  }
}

export const getDefaultSettings = () => {
  return {
    dimensions: {
      width: 315,
      length: 156,
      armrestPosition: 'L',
    },
    changeableProperties: {
      width: true,
      height: true,
      length: true,
      seat_height: false,
      composition: true,
      // seat_depth: false,
      // armrest_width: false,
      // backrest_width: false,
      // corner_part_length: false,
      // mattress_width: false,
      // mattress_length: false,
      // fabric_usage: false,
    },

    composition: [
      {
        shape: 'LCHOUTERL',
        width: 94,
        height: 156,
      },
      {
        shape: 'E',
        width: 100,
        height: 100,
      },
      {
        shape: 'A1R',
        width: 120,
        height: 100,
      },
    ],
  }
}

const COMPOSITE = ({
  id,
  width,
  height,
  x,
  y,
  draggable = false,
  verticalMetric = false,
  horizontalMetric = false,
  layer = null,
  onDelete = null,
  showButtons = false,
  scale = 0,
  stageWidth,
  stageHeight,
  currentRotation = 0,
  originalSofaForm = null,
  armrestWidth = 10,
  backrestWidth = 20,
  mattressWidth = null,
  mattressLength = null,
  composition = null,
  armrestWidthOverride = null,
  rotation = 0,
  onExtentChange = null,
  ...props
}) => {
  const [loadedShapes, setLoadedShapes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const groupRef = useRef(null)
  const membersGroupRef = useRef(null)
  const [measuredExtent, setMeasuredExtent] = useState(null)
  const lastReportedRef = useRef(null)
  // Reset then (maybe) set below in the same render when composition is
  // empty/invalid and we fell back to the placeholder default composition.
  // A ref (not a plain `let`) so it can be read inside the loadShapes effect
  // below without eslint wanting it added as a dependency — its value is
  // only ever consumed by the effect closures that read `.current` fresh at
  // call time, never by this render's own output. This is only used to tag
  // the *load* that's in flight (see loadedIsPlaceholderRef below) — it
  // must NOT gate the measuring effect directly, because `composition` can
  // already say "real" on a render where `loadedShapes` still holds the
  // previous (placeholder) load's shapes, e.g. right after a user adds the
  // first member to an empty composition. Gating on this render-local flag
  // would measure/sync the still-rendered placeholder geometry under a
  // "real" label for that one commit.
  const usingDefaultCompositionRef = useRef(false)
  usingDefaultCompositionRef.current = false
  // Tracks whether the shapes CURRENTLY in `loadedShapes` came from a
  // placeholder (default) composition or a real one — set alongside
  // `setLoadedShapes` in the load effect below, so it always describes what
  // was actually loaded/rendered, not what the latest render intends.
  const loadedIsPlaceholderRef = useRef(false)

  // Measure the real bounding box of the laid-out members after each render.
  // relativeTo the outer group makes the result stage-scale independent.
  useEffect(() => {
    const membersNode = membersGroupRef.current
    const groupNode = groupRef.current
    if (!membersNode || !groupNode || isLoading || loadedShapes.length === 0) {
      return
    }
    if (loadedIsPlaceholderRef.current) {
      // The currently loaded/rendered shapes are the placeholder default
      // composition — keep last measured extent, don't sync.
      return
    }
    const rect = membersNode.getClientRect({
      relativeTo: groupNode,
      skipStroke: true,
      skipShadow: true,
    })
    const extent = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    }
    setMeasuredExtent(prev =>
      prev &&
      prev.x === extent.x &&
      prev.y === extent.y &&
      prev.width === extent.width &&
      prev.height === extent.height
        ? prev
        : extent
    )
    if (
      onExtentChange &&
      (!lastReportedRef.current ||
        lastReportedRef.current.width !== extent.width ||
        lastReportedRef.current.height !== extent.height)
    ) {
      lastReportedRef.current = { width: extent.width, height: extent.height }
      onExtentChange({ width: extent.width, height: extent.height })
    }
  })

  // Load shapes asynchronously.
  //
  // Two hazards, both from `composition` being able to change again before a
  // previous load resolves (dynamic imports are async; modules are usually
  // warm-cached so the window is narrow, but real):
  //
  // 1. Stale-response race: if an OLDER invocation's promises happen to
  //    settle AFTER a NEWER invocation's (no ordering guarantee), the older
  //    one would overwrite the newer, already-correct `loadedShapes` with
  //    outdated data. `cancelled` (set in the cleanup, which React runs
  //    before starting the next invocation) discards a superseded
  //    invocation's results entirely — only the latest invocation can ever
  //    commit `setLoadedShapes` / `loadedIsPlaceholderRef` / `setIsLoading`.
  // 2. Verdict-staleness race: `usingDefaultCompositionRef` is one shared
  //    box mutated by every render's synchronous body. Reading it AFTER an
  //    `await` (as a prior version of this fix did) risks reading a LATER
  //    render's verdict instead of the one that scheduled THIS invocation.
  //    Capturing `isPlaceholderForThisLoad` synchronously, before the first
  //    `await`, freezes the correct verdict for this invocation regardless
  //    of what any later render does to the shared ref afterwards.
  useEffect(() => {
    let cancelled = false
    const isPlaceholderForThisLoad = usingDefaultCompositionRef.current

    const loadShapes = async () => {
      if (!composition || composition.length === 0) return

      setIsLoading(true)
      const shapePromises = composition.map(async shape => {
        const moduleExports = await loadSofaElement(shape.shape)
        return {
          ...shape,
          ModuleShape: moduleExports?.default || null,
          getDimensions: moduleExports?.getDimensions || null,
        }
      })

      try {
        const loadedShapeData = await Promise.all(shapePromises)
        if (cancelled) {
          // Superseded by a newer composition while this load was in
          // flight — discard so an out-of-order resolution can never
          // overwrite fresher state with stale (possibly placeholder)
          // shapes.
          return
        }
        loadedIsPlaceholderRef.current = isPlaceholderForThisLoad
        setLoadedShapes(loadedShapeData)
      } catch (error) {
        if (cancelled) return
        console.error('Error loading shapes:', error)
        setLoadedShapes([])
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadShapes()

    return () => {
      cancelled = true
    }
  }, [composition])

  if (composition?.length === 0 || !composition) {
    const defaults = getDefaultSettings()

    composition = defaults.composition
    width = defaults.dimensions.width
    height = defaults.dimensions.length
    usingDefaultCompositionRef.current = true
  } else if (composition?.startsWith && composition.startsWith('[')) {
    // console.log('composition', composition)

    try {
      const parsedComp = JSON.parse(composition)
      // console.log('parsedComp', parsedComp)
      if (
        parsedComp?.[0].shape &&
        parsedComp?.[0].width &&
        parsedComp?.[0].height
      ) {
        composition = parsedComp
      } else {
        const defaults = getDefaultSettings()
        composition = defaults.composition
        usingDefaultCompositionRef.current = true
      }
    } catch (error) {
      console.error('error', error.message)
      const defaults = getDefaultSettings()
      composition = defaults.composition
      usingDefaultCompositionRef.current = true
    }
  }

  // console.log('composition', props.composition)

  // const defaults = getDefaultSettings()
  // composition = defaults.composition

  //---

  // const shapeArmrestWidth = armrestWidth ?? ARMS_REST_WIDTH
  // const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

  // let groupWidth = width
  // let groupHeight = height
  const dimensions = getDimensions({
    shapeWidth: width,
    shapeHeight: height,
    angle: rotation,
  })
  const connectors = dimensions.connectors

  const nextPost = {
    x: 0,
    y: 0,
    rotation: 0,
  }
  function rotatePoint(x, y, angle) {
    const radians = (Math.PI / 180) * angle
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    return {
      x: x * cos - y * sin,
      y: x * sin + y * cos,
    }
  }
  // Function to calculate the new coordinates of a point after rotation and translation
  function calculateNewCoordinates(point, shapePosition, angle) {
    const rotatedPoint = rotatePoint(point.x, point.y, angle)
    return {
      x: rotatedPoint.x + shapePosition.x,
      y: rotatedPoint.y + shapePosition.y,
    }
  }

  // Show loading state or return early if shapes are still loading
  if (isLoading || loadedShapes.length === 0) {
    return (
      <Group
        id={id}
        draggable={draggable}
        name={'sofa_shape_group'}
        width={width}
        height={height}
        type="COMPOSITE"
        x={x}
        y={y}
        originalWidth={width}
        originalHeight={height}
        dragBoundFunc={dragBound(scale, width, height, stageWidth, stageHeight)}
        originalSofaForm={originalSofaForm}
        connectors={props.enabled_connectors == false ? [] : connectors}
        rotation={rotation}
        armrestPosition={''}
        opacity={0.8}
      >
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          name={'sofa_shape'}
          fill="rgba(200, 200, 200, 0.3)"
        />
        {/* Loading placeholder */}
      </Group>
    )
  }

  const shapesItems = [] as any
  let compositeArmresPossition = ''

  loadedShapes.forEach((shape, index) => {
    const ModuleShape = shape.ModuleShape
    const getDimensions = shape.getDimensions

    let x = nextPost.x
    let y = nextPost.y
    let rotation = nextPost.rotation

    if (ModuleShape && getDimensions) {
      try {
        let dimensions = getDimensions({
          shapeWidth: shape.width,
          shapeHeight: shape.height,
          angle: rotation,
        })

        let leftConnector = dimensions.connectors.find(
          conn => conn.type === 'left'
        )
        let rightConnector = dimensions.connectors.find(
          conn => conn.type === 'right'
        )
        if (index == 0) {
          rotation = -rightConnector?.rotation ?? 0
        }

        // Calculating the armrest position
        if (index == 0 && dimensions.armrestPosition?.includes('L')) {
          compositeArmresPossition = 'L'
        } else if (
          index == loadedShapes.length - 1 &&
          dimensions.armrestPosition?.includes('R')
        ) {
          compositeArmresPossition = compositeArmresPossition + 'R'
        }

        const armrestPosition = dimensions.armrestPosition
        let shapeWidth = shape.width
        if (armrestPosition === 'L' || armrestPosition === 'R') {
          const armOver = armrestWidthOverride ?? armrestWidth
          shapeWidth = shape.width + armOver - armrestWidth

          if (shape.covered_side) {
            shapeWidth = shape.width
          }
        }
        dimensions = getDimensions({
          shapeWidth: shapeWidth,
          shapeHeight: shape.height,
          angle: rotation,
        })

        leftConnector = dimensions.connectors.find(conn => conn.type === 'left')
        rightConnector = dimensions.connectors.find(
          conn => conn.type === 'right'
        )

        // If first one is OpenEnd, it is rotated and moved to position (0,0)
        if (index == 0 && rightConnector?.rotation == -90) {
          rotation = -rightConnector.rotation
          x = shape.height
        }

        if (leftConnector) {
          rotation = -leftConnector.rotation + nextPost.rotation

          const curPos = calculateNewCoordinates(
            leftConnector,
            nextPost,
            leftConnector.rotation + nextPost.rotation
          )
          x = curPos.x
          y = curPos.y
        }

        // Getting starting point for next shape.
        if (rightConnector) {
          const newPos = calculateNewCoordinates(
            rightConnector,
            {
              x: x,
              y: y,
            },
            rotation
          )
          nextPost.x = newPos.x
          nextPost.y = newPos.y
          nextPost.rotation = rotation + rightConnector.rotation
        }

        shapesItems.push(
          <ModuleShape
            key={`shape-${shape.shape}-${index}`}
            id={`shape-${shape.shape}-${index}`}
            x={x}
            y={y}
            width={shape.width}
            height={shape.height}
            stageWidth={stageWidth}
            stageHeight={stageHeight}
            armrestWidth={armrestWidth}
            backrestWidth={shape.backrest_width ?? backrestWidth}
            scale={scale}
            rotation={rotation}
            cornerPartLength={shape.corner_part_length}
            armrestWidthOverride={armrestWidthOverride}
            extensionType={shape.extension_type}
            coveredSide={shape.covered_side}
            angle={shape.angle}
            cornerRadius={shape.corner_radius}
            numberOfBigPillows={shape.number_of_big_pillows}
            numberOfSmallPillows={shape.number_of_small_pillows}
            spreadOfBigPillows={shape.spread_of_big_pillows}
            spreadOfSmallPillows={shape.spread_of_small_pillows}
            sizeOfBigPillow={shape.size_of_big_pillow}
            sizeOfSmallPillow={shape.size_of_small_pillow}
            sizeOfPillow={shape.size_of_pillow}
            backrestType={shape.backrest_type}
            extendablePartLength={shape.extendable_part_length}
            productConfigurationModelName={shape.productConfigurationModelName}
            enabledConnectors={shape.enabled_connectors}
            seatSections={shape.seat_sections}
            backrestSections={shape.backrest_sections}
          />
        )
      } catch (error) {
        console.error('error', error?.message)
      }
    }
  })

  return (
    <Group
      ref={groupRef}
      id={id}
      draggable={draggable}
      name={'sofa_shape_group'}
      width={width}
      height={height}
      type="COMPOSITE"
      x={x}
      y={y}
      originalWidth={measuredExtent?.width ?? width}
      originalHeight={measuredExtent?.height ?? height}
      dragBoundFunc={dragBound(scale, width, height, stageWidth, stageHeight)}
      originalSofaForm={originalSofaForm}
      connectors={props.enabled_connectors == false ? [] : connectors}
      rotation={rotation}
      armrestPosition={compositeArmresPossition}
      opacity={0.8}
    >
      {verticalMetric && (
        <VerticalMetric
          x={(measuredExtent?.x ?? 0) - 50}
          y={measuredExtent?.y ?? 0}
          height={measuredExtent?.height ?? height}
          width={null}
        />
      )}
      {horizontalMetric && (
        <HorizontalMetric
          x={measuredExtent?.x ?? 0}
          y={(measuredExtent?.y ?? 0) - 50}
          height={null}
          width={measuredExtent?.width ?? width}
        />
      )}
      <Rect // This rect is needed to properly get getClientRect dimensions.
        x={measuredExtent?.x ?? 0}
        y={measuredExtent?.y ?? 0}
        width={measuredExtent?.width ?? width}
        height={measuredExtent?.height ?? height}
        name={'sofa_shape'}
      />
      <Group ref={membersGroupRef} name="composite_members">
        {shapesItems}
      </Group>
      {/* {(props.enabled_connectors == false ? [] : connectors)?.map((conn, index) => (
        <Gizmo
          key={`gizmo-${index}`}
          settings={conn}
          shapeHeight={shapeHeight}
          shapeWidth={shapeWidth}
        />
        
      ))} */}
    </Group>
  )
}

export default COMPOSITE
