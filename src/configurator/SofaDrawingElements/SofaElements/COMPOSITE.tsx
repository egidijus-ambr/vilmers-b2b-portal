// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react'
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
  ...props
}) => {
  const [loadedShapes, setLoadedShapes] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Load shapes asynchronously
  useEffect(() => {
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
        setLoadedShapes(loadedShapeData)
      } catch (error) {
        console.error('Error loading shapes:', error)
        setLoadedShapes([])
      } finally {
        setIsLoading(false)
      }
    }

    loadShapes()
  }, [composition])

  if (composition?.length === 0 || !composition) {
    const defaults = getDefaultSettings()

    composition = defaults.composition
    width = defaults.dimensions.width
    height = defaults.dimensions.length
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
      }
    } catch (error) {
      console.error('error', error.message)
      const defaults = getDefaultSettings()
      composition = defaults.composition
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
            backrestWidth={backrestWidth}
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
      armrestPosition={compositeArmresPossition}
      opacity={0.8}
    >
      {verticalMetric && (
        <VerticalMetric x={0 - 50} y={0} height={height} width={null} />
      )}
      {horizontalMetric && (
        <HorizontalMetric x={0} y={0 - 50} height={null} width={width} />
      )}
      <Rect // This rect is needed to properly get getClientRect dimensions.
        x={0}
        y={0}
        width={width}
        height={height}
        name={'sofa_shape'}
      />
      {shapesItems}
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
