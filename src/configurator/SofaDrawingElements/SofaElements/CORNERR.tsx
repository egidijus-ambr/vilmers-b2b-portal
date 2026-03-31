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
import { haveIntersection } from '../utils'
import {
  ARMS_REST_WIDTH,
  BACK_REST_WIDTH,
  BACKREST_PILLOW_SIZE,
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

// Type definitions
interface PillowPoint {
  x: number
  y: number
  rotation: number
}

export const getDefaultSettings = () => {
  return {
    dimensions: {
      width: 100,
      length: 100,
      armrestPosition: '',
      corner_radius: 0,

      number_of_big_pillows: 1,
      number_of_small_pillows: 0,
      spread_of_small_pillows: 60,
      spread_of_big_pillows: 60,
      size_of_big_pillow: STANDART_PILLOW_SIZE,
      size_of_pillow: STANDART_PILLOW_SIZE,
    },
    changeableProperties: {
      width: true,
      height: true,
      length: true,
      seat_height: false,
      //corner_radius: true,
      // seat_depth: false,
      armrest_width: false,
      backrest_width: true,

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
        type: 'left',
        x: 0,
        y: 0,
        rotation: 0,
      },
      {
        type: 'right',
        x: shapeWidth,
        y: shapeHeight,
        rotation: 90,
      },
    ],
  }
}

const CORNERR = ({
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
  numberOfBigPillows = 0,
  numberOfSmallPillows = 0,
  spreadOfBigPillows = 50,
  spreadOfSmallPillows = 40,
  sizeOfPillow = 30, // Width of pillow in cm
  sizeOfBigPillow = STANDART_PILLOW_SIZE, // Width of pillow in cm
  ...props
}) => {
  //----

  //---

  const shapeWidth = width
  const shapeHeight = height

  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

  let backPillowSize = sizeOfBigPillow ?? BACKREST_PILLOW_SIZE

  let xOffset = x
  let yOffset = y

  let groupWidth = shapeWidth
  let groupHeight = shapeHeight

  let shapeOffsetFix = 0

  const dimensions = getDimensions({
    shapeWidth,
    shapeHeight,
    angle: rotation,
  })
  const connectors = dimensions.connectors

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

  //---------------
  const numberOfPillows = numberOfBigPillows // Number of pillows
  const pillowSpacing = spreadOfBigPillows ?? 50 // Control the spacing between pillows
  const [pillows, setPillows] = useState<PillowPoint[]>([])

  const calculatePillowPositions = (
    numberOfPillows: number,
    pillowSize: number
  ): PillowPoint[] => {
    if (numberOfPillows <= 0 || numberOfPillows > 6) {
      return []
    }

    const pillows: PillowPoint[] = []
    const margin = pillowSize * 0.3 // Small margin from edges

    // Define key positions (mirrored for CORNERR)
    const cornerX = shapeWidth - shapeBackrestWidth - margin
    const cornerY = shapeBackrestWidth + margin

    // Horizontal backrest positions (bottom side)
    const horizontalY = shapeHeight - shapeBackrestWidth - margin
    const horizontalStartX = cornerX - pillowSize - margin
    const horizontalEndX = pillowSize + margin

    // Vertical backrest positions (right side)
    const verticalX = shapeWidth - shapeBackrestWidth - margin
    const verticalStartY = cornerY - pillowSize - margin
    const verticalEndY = pillowSize + margin

    switch (numberOfPillows) {
      case 1:
        // Single pillow in corner, rotated 45 degrees
        pillows.push({
          x: shapeWidth - shapeBackrestWidth - margin,
          y: shapeBackrestWidth + margin,
          rotation: 45,
        })
        break

      case 2:
        // Two pillows on the sides of backrest
        pillows.push({
          x: (shapeWidth - shapeBackrestWidth) / 2,
          y: shapeBackrestWidth + margin / 2,
          rotation: 0,
        })
        pillows.push({
          x: shapeWidth - shapeBackrestWidth - margin / 2,
          y: (shapeHeight - shapeBackrestWidth) / 2 + shapeBackrestWidth,
          rotation: 90,
        })
        break

      case 3:
        // Corner pillow + two side pillows
        pillows.push({
          x: shapeWidth - shapeBackrestWidth - margin,
          y: shapeBackrestWidth + margin,
          rotation: 45,
        })
        pillows.push({
          x: (shapeWidth - shapeBackrestWidth) / 2 - margin / 2,
          y: shapeBackrestWidth + margin / 2,
          rotation: 0,
        })
        pillows.push({
          x: shapeWidth - shapeBackrestWidth - margin / 2,
          y:
            (shapeHeight - shapeBackrestWidth) / 2 +
            shapeBackrestWidth +
            margin / 2,
          rotation: 90,
        })
        break

      default:
        break
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
  ])

  return (
    <Group
      id={id}
      draggable={draggable}
      name={'sofa_shape_group'}
      width={groupWidth}
      height={groupHeight}
      type="CORNERR"
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
        offsetX={shapeWidth / 2}
        offsetY={shapeHeight / 2}
        // We need to set x, y, origin in center
        x={shapeWidth / 2 + shapeOffsetFix}
        y={shapeHeight / 2 - shapeOffsetFix}
        //----
        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath()
          ctx.moveTo(shapeWidth, 0)
          ctx.lineTo(shapeWidth - shapeBackrestWidth, shapeBackrestWidth)
          ctx.moveTo(shapeWidth - shapeBackrestWidth, shapeBackrestWidth)
          ctx.lineTo(shapeWidth - shapeBackrestWidth, shapeHeight)
          ctx.moveTo(shapeWidth - shapeBackrestWidth, shapeBackrestWidth)
          ctx.lineTo(0, shapeBackrestWidth)
          ctx.rect(0, 0, shapeWidth, shapeHeight)
          ctx.fillStrokeShape(shape)
        }}
        stroke="black"
        strokeWidth={1}
        name={'sofa_shape'}
      />

      <Shape
        // --- Drawing shadows, on top of shape
        offsetX={shapeWidth / 2}
        offsetY={shapeHeight / 2}
        // We need to set x, y, origin in center
        x={shapeWidth / 2 + shapeOffsetFix}
        y={shapeHeight / 2 - shapeOffsetFix}
        //----
        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath()
          // Draw shadow (mirrored for CORNERR)
          ctx.moveTo(
            shapeWidth - shapeBackrestWidth - SHADOW_WIDTH + 2,
            shapeBackrestWidth + SHADOW_WIDTH - 2
          )
          ctx.lineTo(
            shapeWidth - shapeBackrestWidth - SHADOW_WIDTH + 2,
            shapeHeight - 2
          )
          ctx.moveTo(
            shapeWidth - shapeBackrestWidth - 1,
            shapeBackrestWidth + SHADOW_WIDTH - 2
          )
          ctx.lineTo(2, shapeBackrestWidth + SHADOW_WIDTH - 2)
          ctx.fillStrokeShape(shape)
        }}
        stroke={MAIN_SHAPE_SHADOW_COLOR}
        strokeWidth={SHADOW_WIDTH}
      />
      {pillows.map((pillow, index) => {
        return (
          <PillowComponent
            key={index}
            x={pillow.x}
            y={pillow.y}
            rotation={pillow.rotation}
            size={backPillowSize}
            tension={0.3}
          />
        )
      })}

      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo
            key={`gizmo-${index}`}
            settings={conn}
            shapeHeight={shapeHeight}
            shapeWidth={shapeWidth}
          />
        )
      )}
    </Group>
  )
}

export default CORNERR
