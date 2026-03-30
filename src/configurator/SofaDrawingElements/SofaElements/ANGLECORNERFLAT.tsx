import React, { useCallback, useEffect, useState } from 'react'
import { Shape, Group, Rect, Circle, Image, Line } from 'react-konva'
import { haveIntersection } from '../utils'
import {
  ANGLE_CORNER_ANGLE,
  ARMS_REST_WIDTH,
  BACK_REST_WIDTH,
  BACKREST_PILLOW_SIZE,
  LCH_ANGLE_ARMSREST_LENGTH_PERCETAGE,
  MAIN_SHAPE_COLOR,
  MAIN_SHAPE_SHADOW_COLOR,
  METRIC_SIZE,
  SHADOW_WIDTH,
  STANDART_PILLOW_SIZE,
} from './constants'
import { HorizontalMetric, VerticalMetric } from './MetricLines'
import Konva from 'konva'

import Gizmo from '../Gizmo'
import PillowComponent from './PillowComponent'
//import { drawShapeLeft, drawShapeRight } from './ANGLECORNER'

// Type definitions
interface PillowPoint {
  x: number
  y: number
  rotation: number
}

export const drawShape = (
  ctx,
  shape,
  { shapeWidth, shapeHeight, shapeBackrestWidth, cornerPartLength, angle }
) => {
  let cornerCutOff = shapeWidth - (cornerPartLength ?? shapeWidth)

  const angleT = ((90 - angle) * Math.PI) / 180 // Convert degrees to radians
  const backL = shapeWidth * Math.tan(angleT)

  ctx.beginPath()
  ctx.moveTo(0, 0)

  ctx.lineTo(shapeWidth - backL, backL)

  const topRC_x =
    shapeWidth -
    (((shapeWidth - backL) / shapeWidth) * shapeBackrestWidth + backL)
  const topRC_y =
    ((shapeWidth - backL) / shapeWidth) * shapeBackrestWidth + backL

  ctx.lineTo(topRC_x, topRC_y)
  //ctx.lineTo(shapeWidth, shapeBackrestWidth)
  ctx.lineTo(0, shapeBackrestWidth)
  ctx.lineTo(0, 0)
  ctx.fillStrokeShape(shape)

  ctx.moveTo(topRC_x, topRC_y)
  ctx.lineTo(shapeWidth - backL, backL)
  ctx.lineTo(shapeWidth, shapeHeight)
  ctx.lineTo(shapeWidth - shapeBackrestWidth, shapeHeight)
  ctx.lineTo(topRC_x, topRC_y)
  ctx.fillStrokeShape(shape)

  ctx.moveTo(0, shapeBackrestWidth)
  ctx.lineTo(topRC_x, topRC_y)
  ctx.lineTo(shapeWidth - shapeBackrestWidth, shapeHeight)
  ctx.lineTo(cornerCutOff, shapeHeight)

  ctx.lineTo(0, shapeHeight - cornerCutOff)
  ctx.lineTo(0, shapeBackrestWidth)

  ctx.fillStrokeShape(shape)
}
export const getDefaultSettings = () => {
  return {
    dimensions: {
      width: 100,
      length: 100,
      armrestPosition: '',
      corner_part_length: 100,
      angle: 80,
      number_of_big_pillows: 1,
      spread_of_big_pillows: STANDART_PILLOW_SIZE,
      size_of_big_pillow: STANDART_PILLOW_SIZE,
    },
    changeableProperties: {
      width: true,
      height: true,
      length: true,
      seat_height: false,
      //corner_radius: true,
      // seat_depth: false,
      // armrest_width: false,
      backrest_width: true,
      angle: true,
      corner_part_length: true,

      number_of_big_pillows: true,
      //number_of_small_pillows: true,
      //spread_of_small_pillows: true,
      //spread_of_big_pillows: true,
      size_of_big_pillow: true,
      //size_of_pillow: true,
      // corner_part_length: false,
      // mattress_width: false,
      // mattress_length: false,
      // fabric_usage: false,
    },
  }
}

export const getDimensions = ({ shapeWidth, shapeHeight, angle }) => {
  return {
    armrestPosition: null,
    connectors: [
      {
        type: 'right',
        y: shapeHeight,
        x: shapeWidth,
        rotation: 90,
      },
      {
        type: 'left',
        x: 0,
        y: 0,
        rotation: 0,
      },
    ],
  }
}

const ANGLECORNERFLAT = ({
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
  rotation = 0,
  angle = 90,
  depth = 0,
  armrestWidthOverride = null,
  cornerPartLength = 0,
  numberOfBigPillows = 0,
  numberOfSmallPillows = 0,
  spreadOfBigPillows = 50,
  spreadOfSmallPillows = 40,
  sizeOfPillow = 30, // Width of pillow in cm
  sizeOfBigPillow = STANDART_PILLOW_SIZE, // Width of pillow in cm
  ...props
}) => {
  //----  )

  const armOver = armrestWidthOverride ?? armrestWidth

  const shapeWidth = width
  const shapeHeight = height

  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

  let backPillowSize = sizeOfBigPillow ?? BACKREST_PILLOW_SIZE

  let xOffset = x
  let yOffset = y

  let groupWidth = shapeWidth
  let groupHeight = shapeHeight

  const dimensions = getDimensions({
    shapeWidth,
    shapeHeight,
    angle: rotation,
  })
  const connectors = dimensions.connectors

  //---------------
  const numberOfPillows = numberOfBigPillows // Number of pillows
  const pillowSpacing = spreadOfBigPillows ?? 50 // Control the spacing between pillows
  const [pillows, setPillows] = useState<PillowPoint[]>([])

  const calculatePillowPositions = (
    numberOfPillows: number,
    pillowSize: number
  ): PillowPoint[] => {
    if (numberOfPillows <= 0 || numberOfPillows > 4) {
      return []
    }

    const pillows: PillowPoint[] = []
    const margin = pillowSize * 0.2 // Small margin from edges

    // Calculate the exact same coordinates as used in drawShape for backrest lines
    const angleT = ((90 - angle) * Math.PI) / 180
    const backL = shapeWidth * Math.tan(angleT)

    const topRC_x =
      shapeWidth -
      (((shapeWidth - backL) / shapeWidth) * shapeBackrestWidth + backL)
    const topRC_y =
      ((shapeWidth - backL) / shapeWidth) * shapeBackrestWidth + backL

    // Define the continuous backrest path: (0, shapeBackrestWidth) -> (topRC_x, topRC_y) -> (shapeWidth - shapeBackrestWidth, shapeHeight)
    // const pathPoints = [
    //   { x: 0, y: shapeBackrestWidth },
    //   { x: topRC_x, y: topRC_y },
    //   { x: shapeWidth - shapeBackrestWidth, y: shapeHeight },
    // ]

    // Calculate total path length
    const segment1Length = Math.sqrt(
      Math.pow(topRC_x - 0, 2) + Math.pow(topRC_y - shapeBackrestWidth, 2)
    )
    const segment2Length = Math.sqrt(
      Math.pow(shapeWidth - shapeBackrestWidth - topRC_x, 2) +
        Math.pow(shapeHeight - topRC_y, 2)
    )
    const totalLength = segment1Length + segment2Length

    // Function to get point along the path at a given distance from start
    const getPointAtDistance = (distance: number) => {
      const offsetDistance = -pillowSize * 0.2 // Distance to move pillow away from backrest

      if (distance <= segment1Length) {
        // Point is on first segment
        const ratio = distance / segment1Length
        const baseX = 0 + (topRC_x - 0) * ratio
        const baseY =
          shapeBackrestWidth + (topRC_y - shapeBackrestWidth) * ratio
        const angle = Math.atan2(topRC_y - shapeBackrestWidth, topRC_x - 0)

        // Calculate perpendicular offset (90 degrees to the right of the line direction)
        const perpAngle = angle - Math.PI / 2
        const offsetX = baseX + Math.cos(perpAngle) * offsetDistance
        const offsetY = baseY + Math.sin(perpAngle) * offsetDistance

        return { x: offsetX, y: offsetY, rotation: (angle * 180) / Math.PI }
      } else {
        // Point is on second segment
        const remainingDistance = distance - segment1Length
        const ratio = remainingDistance / segment2Length
        const baseX =
          topRC_x + (shapeWidth - shapeBackrestWidth - topRC_x) * ratio
        const baseY = topRC_y + (shapeHeight - topRC_y) * ratio
        const angle = Math.atan2(
          shapeHeight - topRC_y,
          shapeWidth - shapeBackrestWidth - topRC_x
        )

        // Calculate perpendicular offset (90 degrees to the right of the line direction)
        const perpAngle = angle - Math.PI / 2
        const offsetX = baseX + Math.cos(perpAngle) * offsetDistance
        const offsetY = baseY + Math.sin(perpAngle) * offsetDistance

        return { x: offsetX, y: offsetY, rotation: (angle * 180) / Math.PI }
      }
    }

    // Apply margin adjustment to the effective path length
    const effectiveLength = totalLength - 2 * margin

    // Calculate rotation angles for both segments for middle pillow averaging
    const segment1Angle = Math.atan2(topRC_y - shapeBackrestWidth, topRC_x - 0)
    const segment2Angle = Math.atan2(
      shapeHeight - topRC_y,
      shapeWidth - shapeBackrestWidth - topRC_x
    )
    const averageRotation =
      ((segment1Angle + segment2Angle) / 2) * (180 / Math.PI)

    // Position pillows evenly along the path
    for (let i = 0; i < numberOfPillows; i++) {
      const position = (i + 0.5) / numberOfPillows // Center pillows in their sections
      const distance = margin + effectiveLength * position
      const isMiddlePillow =
        (numberOfPillows === 1 && i === 0) || (numberOfPillows === 3 && i === 1)

      const point = getPointAtDistance(
        isMiddlePillow ? distance * 1.1 : distance
      )

      // Special rotation for middle pillow when there are 1 or 3 pillows
      let pillowRotation = point.rotation

      if (isMiddlePillow) {
        pillowRotation = averageRotation
      }

      pillows.push({
        x: point.x,
        y: point.y,
        rotation: pillowRotation,
      })
    }

    return pillows
  }

  useEffect(() => {
    const newPillows = calculatePillowPositions(numberOfPillows, backPillowSize)
    setPillows(newPillows)
  }, [
    numberOfPillows,
    backPillowSize,
    shapeWidth,
    shapeHeight,
    shapeBackrestWidth,
    angle,
  ])

  // console.log('AX :>> ', AX)
  // console.log('FullY :>> ', FullY)

  // A function that limits exit of View zone
  const dragBound = e => {
    // ---
    // console.log('incoking drag bound e :>> ', e)
    let pos = e
    if (pos) {
      // Left side
      if (pos.x < 0 + METRIC_SIZE * scale) {
        pos.x = 0 + METRIC_SIZE * scale
      }
      // Right side
      if (pos.x + groupWidth * scale > stageWidth) {
        pos.x = stageWidth - groupWidth * scale
      }
      // Top side
      if (pos.y < 0 + METRIC_SIZE * scale) {
        pos.y = 0 + METRIC_SIZE * scale
      }
      // Bottom side
      if (pos.y + groupHeight * scale > stageHeight) {
        pos.y = stageHeight - groupHeight * scale
      }
    }
    return pos
  }

  return (
    <Group
      id={id}
      draggable={draggable}
      name={'sofa_shape_group'}
      width={groupWidth}
      height={groupHeight}
      type="ANGLECORNERFLAT"
      x={xOffset}
      y={yOffset}
      originalWidth={width}
      originalHeight={height}
      dragBoundFunc={e => dragBound(e)}
      originalSofaForm={originalSofaForm}
      connectors={props.enabled_connectors == false ? [] : connectors}
      rotation={rotation}
    >
      {verticalMetric && (
        <VerticalMetric x={0 - 50} y={0} height={groupHeight} width={null} />
      )}
      {horizontalMetric && (
        <HorizontalMetric x={0} y={0 - 50} height={null} width={groupWidth} />
      )}
      <Rect // This rect is needed to properly get getClientRect dimensions.
        x={0}
        y={0}
        width={shapeWidth}
        height={shapeHeight}
      />

      <Shape
        // ---
        offsetX={0}
        offsetY={0}
        // We need to set x, y, origin in center
        x={0}
        y={0}
        //----
        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) =>
          drawShape(ctx, shape, {
            shapeWidth,
            shapeHeight,
            shapeBackrestWidth,
            cornerPartLength,
            angle,
          })
        }
        stroke="black"
        strokeWidth={1}
        name={'sofa_shape'}
      />

      {pillows.map((pillow, index) => {
        return (
          <PillowComponent
            key={index}
            x={pillow.x}
            y={pillow.y}
            rotation={pillow.rotation}
            size={backPillowSize}
            stroke="black"
            strokeWidth={1}
            fill="#ddd"
            tension={0.3}
          />
        )
      })}

      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo key={`gizmo-${index}`} settings={conn} />
        )
      )}
    </Group>
  )
}

export default ANGLECORNERFLAT
