import React, { useCallback, useEffect, useState } from 'react'
import { Shape, Group, Rect, Circle, Image, Line } from 'react-konva'
import { haveIntersection } from '../utils'
import {
  ANGLE_CORNER_ANGLE,
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
import PillowComponent from './PillowComponent'

import Gizmo from '../Gizmo'
import { drawShapeLeft, drawShapeRight } from './ANGLECORNER'

export const getDefaultSettings = () => {
  return {
    dimensions: {
      width: 100,
      length: 100,
      armrestPosition: 'R',
      angle: 30,
      corner_part_length: 80,
      number_of_big_pillows: 0,
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
      armrest_width: true,
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
    armrestPosition: 'R',
    connectors: [
      {
        type: 'left',
        x: 0,
        y: 0,
        rotation: 0,
      },
    ],
  }
}

const ANGLECORNERLCHR = ({
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
  angle = null,
  depth = 0,
  armrestWidthOverride = null,
  cornerPartLength = 20,
  numberOfBigPillows = null,
  numberOfSmallPillows = null,
  spreadOfBigPillows = null,
  spreadOfSmallPillows = null,
  sizeOfPillow = null, // Width of pillow in cm
  sizeOfBigPillow = null, // Width of pillow in cm
  ...props
}) => {
  //----

  const armOver = armrestWidthOverride ?? armrestWidth
  const shapeArmrestWidth = armOver ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH
  const connectionAngle = angle ?? ANGLE_CORNER_ANGLE

  const angleT = (connectionAngle * Math.PI) / 180 // Convert degrees to radians
  //const angleLine = ((connectionAngle / 2) * Math.PI) / 180

  const cosAngle = Math.cos(angleT)
  const sinAngle = Math.sin(angleT)

  //calculating the armerest width from top view
  const armOverTop = armOver * cosAngle
  const armOarmrestWidthTop = armrestWidth * cosAngle

  const shapeWidth = width + armOverTop - armOarmrestWidthTop
  const shapeHeight = height

  const withWitoutArmrest = shapeWidth - armOverTop
  const singleShapeWidth = withWitoutArmrest / (1 + cosAngle)

  const endPointY = singleShapeWidth * sinAngle
  const bottomX = withWitoutArmrest - (height - endPointY) * Math.tan(angleT)

  //ponts to draw the backrest
  const midlePointAngle = (180 - connectionAngle) / 2
  const middlePointX =
    singleShapeWidth -
    shapeBackrestWidth / Math.tan((midlePointAngle * Math.PI) / 180)

  const endPointXBackrest = middlePointX + singleShapeWidth * cosAngle
  const endPointYBackrest = backrestWidth + singleShapeWidth * sinAngle

  // === PILLOWS ===
  let pillowSize = sizeOfPillow ?? STANDART_PILLOW_SIZE
  let backPillowSize = sizeOfBigPillow ?? BACKREST_PILLOW_SIZE

  let backPillowNumber = numberOfBigPillows ?? 0
  const numberOfPillows = backPillowNumber // Number of pillows
  const pillowSpacing = spreadOfBigPillows ?? 50 // Control the spacing between pillows
  const [pillows, setPillows] = useState<
    Array<{ x: number; y: number; rotation: number }>
  >([])

  const interpolatePoints = (points, numberOfPillows, pillowSpacing) => {
    if (numberOfPillows === 0) {
      return []
    }

    // Calculate number of segments from points array (points come in pairs x,y)
    const numPoints = points.length / 2
    const numSegments = numPoints - 1

    if (numSegments < 1) {
      return []
    }

    // Calculate segment lengths dynamically
    const segmentLengths: number[] = []
    for (let i = 0; i < numSegments; i++) {
      const x1 = points[i * 2]
      const y1 = points[i * 2 + 1]
      const x2 = points[(i + 1) * 2]
      const y2 = points[(i + 1) * 2 + 1]

      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
      segmentLengths.push(length)
    }

    const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0)
    const interpolatedPoints: Array<{
      x: number
      y: number
      rotation: number
    }> = []

    // Calculate even spacing along the entire path
    const actualSpacing = totalLength / (numberOfPillows + 1)

    for (let i = 0; i < numberOfPillows; i++) {
      const targetDistance = actualSpacing * (i + 1)
      let currentDistance = 0
      let segmentIndex = 0

      // Find which segment this pillow falls in
      while (
        segmentIndex < segmentLengths.length &&
        currentDistance + segmentLengths[segmentIndex] < targetDistance
      ) {
        currentDistance += segmentLengths[segmentIndex]
        segmentIndex++
      }

      if (segmentIndex >= segmentLengths.length) {
        segmentIndex = segmentLengths.length - 1
      }

      // Calculate position within the segment
      const distanceInSegment = targetDistance - currentDistance
      const t =
        segmentLengths[segmentIndex] > 0
          ? distanceInSegment / segmentLengths[segmentIndex]
          : 0

      const x1 = points[segmentIndex * 2]
      const y1 = points[segmentIndex * 2 + 1]
      const x2 = points[(segmentIndex + 1) * 2]
      const y2 = points[(segmentIndex + 1) * 2 + 1]

      let pillow = {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
        rotation: 0,
      }

      // Calculate rotation based on segment direction
      const dx = x2 - x1
      const dy = y2 - y1
      const angle = Math.atan2(dy, dx) * (180 / Math.PI)

      // Round to nearest 45 degrees for cleaner rotations
      pillow.rotation = Math.round(angle / 45) * 45

      // Apply inward positioning based on rotation
      const inwardOffset = backPillowSize / 8
      if (Math.abs(pillow.rotation) < 45) {
        // Mostly horizontal - move up
        pillow.y += inwardOffset
      } else if (
        Math.abs(pillow.rotation - 90) < 45 ||
        Math.abs(pillow.rotation + 90) < 45
      ) {
        // Mostly vertical - move left
        pillow.x -= inwardOffset
      } else {
        // Diagonal - move diagonally inward
        pillow.x -= inwardOffset * 0.7
        pillow.y += inwardOffset * 0.7
      }

      interpolatedPoints.push(pillow)
    }

    // Check for overlaps and add rotation adjustment if needed
    const checkForOverlaps = pillows => {
      return pillows.map((pillow, index) => {
        let hasOverlap = false

        // Check distance to all other pillows
        for (let j = 0; j < pillows.length; j++) {
          if (index !== j) {
            const otherPillow = pillows[j]
            const distance = Math.sqrt(
              Math.pow(pillow.x - otherPillow.x, 2) +
                Math.pow(pillow.y - otherPillow.y, 2)
            )

            // If distance is less than pillow size, they overlap
            if (distance < backPillowSize * 0.8) {
              // 0.8 factor for some tolerance
              hasOverlap = true
              break
            }
          }
        }

        return {
          ...pillow,
          rotation: pillow.rotation + (hasOverlap ? 15 : 0),
        }
      })
    }

    return checkForOverlaps(interpolatedPoints)
  }

  useEffect(() => {
    // Define the backrest line: from middlePointX to endPointXBackrest, endPointYBackrest
    const points = [
      middlePointX,
      backrestWidth,
      endPointXBackrest,
      endPointYBackrest,
    ]

    const interpolatedPoints = interpolatePoints(
      points,
      numberOfPillows,
      pillowSpacing
    )

    const newPillows = interpolatedPoints.map(pillow => ({
      x: pillow.x,
      y: pillow.y,
      rotation: pillow.rotation,
    }))

    setPillows(newPillows)
  }, [
    numberOfPillows,
    pillowSpacing,
    shapeBackrestWidth,
    middlePointX,
    endPointXBackrest,
    endPointYBackrest,
    backPillowSize,
  ])

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
      if (pos.x + shapeWidth * scale > stageWidth) {
        pos.x = stageWidth - shapeWidth * scale
      }
      // // Top side
      if (pos.y < 0 + METRIC_SIZE * scale) {
        pos.y = 0 + METRIC_SIZE * scale
      }
      // // Bottom side
      if (pos.y + shapeHeight * scale > stageHeight) {
        pos.y = stageHeight - shapeHeight * scale
      }
    }
    return pos
  }

  return (
    <Group
      id={id}
      draggable={draggable}
      name={'sofa_shape_group'}
      width={shapeWidth}
      height={shapeHeight}
      type="ANGLECORNERLCHR"
      x={x}
      y={y}
      originalWidth={width}
      originalHeight={height}
      dragBoundFunc={e => dragBound(e)}
      originalSofaForm={originalSofaForm}
      connectors={props.enabled_connectors == false ? [] : connectors}
      rotation={rotation}
      armrestPosition={dimensions.armrestPosition}
    >
      {verticalMetric && (
        <VerticalMetric x={0 - 50} y={0} height={shapeHeight} width={null} />
      )}
      {horizontalMetric && (
        <HorizontalMetric x={0} y={0 - 50} height={null} width={shapeWidth} />
      )}
      <Rect // This rect is needed to properly get getClientRect dimensions.
        x={0}
        y={0}
        width={shapeWidth}
        height={shapeHeight}
        // fill={'red'}
      />

      <Shape
        x={0}
        y={0}
        //----

        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath()
          ctx.moveTo(0, 0)

          ctx.lineTo(singleShapeWidth, 0)
          ctx.lineTo(withWitoutArmrest, endPointY)

          //  ctx.lineTo(cornerPartLength, endPointY)
          ctx.lineTo(bottomX, height)
          ctx.lineTo(0, cornerPartLength)
          ctx.lineTo(0, 0)
          ctx.fillStrokeShape(shape)
          ctx.closePath()

          ctx.moveTo(0, backrestWidth)
          ctx.lineTo(middlePointX, backrestWidth)
          ctx.lineTo(endPointXBackrest, endPointYBackrest)
          ctx.fillStrokeShape(shape)

          ctx.moveTo(middlePointX, backrestWidth)
          ctx.lineTo(singleShapeWidth, 0)
          ctx.fillStrokeShape(shape)
        }}
        stroke="black"
        strokeWidth={1}
        name={'sofa_shape'}
        rotation={0}
      />

      <Rect // armrest
        x={withWitoutArmrest}
        y={endPointY}
        width={shapeArmrestWidth}
        height={cornerPartLength}
        rotation={connectionAngle}
        fill={MAIN_SHAPE_COLOR}
        stroke="black"
        strokeWidth={1}
      />

      {/* BACKREST PILLOWS */}
      <Group>
        {pillows.map((pillow, index) => (
          <PillowComponent
            key={index}
            x={pillow.x}
            y={pillow.y}
            rotation={pillow.rotation}
            size={backPillowSize}
            stroke="black"
            strokeWidth={1}
            fill={'#ddd'}
          />
        ))}
      </Group>

      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo key={`gizmo-${index}`} settings={conn} />
        )
      )}
    </Group>
  )
}

export default ANGLECORNERLCHR
