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
import { haveIntersection } from '../utils'
import {
  ARMS_REST_WIDTH,
  BACKREST_PILLOW_SIZE,
  BACK_REST_WIDTH,
  LCH_ARMSREST_LENGTH_PERCETAGE,
  MAIN_SHAPE_COLOR,
  MAIN_SHAPE_SHADOW_COLOR,
  METRIC_SIZE,
  OTK_ARMSREST_LENGTH_PERCETAGE,
  SHADOW_WIDTH,
  STANDART_PILLOW_SIZE,
} from './constants'
import { HorizontalMetric, VerticalMetric } from './MetricLines'
import Konva from 'konva'
// import RotateRightIcon from '@mui/icons-material/RotateRight'

import Gizmo from '../Gizmo'

// "/svg_icons/arrow-rotate-right-solid.svg"
// "/svg_icons/trash-solid.svg"

export const getDefaultSettings = () => {
  return {
    dimensions: {
      width: 150,
      length: 230,
      armrestPosition: '',
    },
    changeableProperties: {
      width: true,
      height: true,
      length: true,
      backrest_width: true,

      number_of_big_pillows: true,
      spread_of_big_pillows: true,
      size_of_big_pillow: true,
      corner_radius: true, // New property to change corner radius
      corner_part_length: true,
    },
  }
}

export const getDimensions = ({ shapeWidth, shapeHeight, angle }) => {
  return {
    armrestPosition: '',
    connectors: [
      {
        type: 'right',
        x: shapeWidth,
        y: 0,
        rotation: 0,
      },
    ],
  }
}

const OTKCMANYPILLOWL = ({
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
  numberOfSmallPillows = null,
  spreadOfBigPillows = null,
  spreadOfSmallPillows = null,
  sizeOfPillow = null, // Width of pillow in cm
  sizeOfBigPillow = null, // Width of pillow in cm
  cornerRadius = 0,
  ...props
}) => {
  //----

  const shapeWidth = width
  const shapeHeight = height

  // === CORNER PART ====
  const cornerPartLength = props.cornerPartLength ?? shapeWidth

  const shapeArmrestWidth = armrestWidth ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

  //=== Pillows
  let pillowSize = sizeOfPillow ?? STANDART_PILLOW_SIZE
  let backPillowSize = sizeOfBigPillow ?? BACKREST_PILLOW_SIZE
  let backPillowNumber = numberOfBigPillows ?? 0

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
  const numberOfPillows = backPillowNumber // Number of pillows
  const pillowSpacing = spreadOfBigPillows ?? 50 // Control the spacing between pillows
  const [pillows, setPillows] = useState([])
  const [debugPoints, setDebugPoints] = useState([])

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
    const segmentLengths = []
    for (let i = 0; i < numSegments; i++) {
      const x1 = points[i * 2]
      const y1 = points[i * 2 + 1]
      const x2 = points[(i + 1) * 2]
      const y2 = points[(i + 1) * 2 + 1]

      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
      segmentLengths.push(length)
    }

    const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0)
    const interpolatedPoints = []

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

      // Apply inward positioning based on rotation (adjusted for left side)
      const inwardOffset = backPillowSize / 8
      if (Math.abs(pillow.rotation) < 45) {
        // Mostly horizontal - move up
        pillow.y += inwardOffset
      } else if (
        Math.abs(pillow.rotation - 90) < 45 ||
        Math.abs(pillow.rotation + 90) < 45
      ) {
        // Mostly vertical - move right (inward for left side)
        pillow.x += inwardOffset
      } else {
        // Diagonal - move diagonally inward (toward the right for left side)
        pillow.x += inwardOffset * 0.7
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
          rotation: pillow.rotation + (hasOverlap ? -15 : 0),
        }
      })
    }

    return checkForOverlaps(interpolatedPoints)
  }

  useEffect(() => {
    const points = [
      shapeWidth,
      0 + shapeBackrestWidth + backPillowSize / 5,

      shapeWidth - backPillowSize,
      0 + shapeBackrestWidth + backPillowSize / 5,

      shapeBackrestWidth + backPillowSize / 8,
      backPillowSize / 2 + shapeBackrestWidth,

      shapeBackrestWidth + backPillowSize / 8,
      shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE -
        shapeBackrestWidth +
        backPillowSize,
    ]

    // Store debug points for visualization
    const debugPointsArray = []
    for (let i = 0; i < points.length; i += 2) {
      debugPointsArray.push({
        x: points[i],
        y: points[i + 1],
      })
    }
    setDebugPoints(debugPointsArray)

    const interpolatedPoints = interpolatePoints(
      points,
      numberOfPillows,
      pillowSpacing
    )

    const newPillows = interpolatedPoints.map(pillow => ({
      x: pillow.x, // Adding the initial offset
      y: pillow.y,
      rotation: pillow.rotation,
    }))

    setPillows(newPillows)
  }, [numberOfPillows, pillowSpacing, shapeBackrestWidth])

  return (
    <Group
      id={id}
      draggable={draggable}
      name={'sofa_shape_group'}
      width={groupWidth}
      height={groupHeight}
      type="OTKCMANYPILLOWL"
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
        <VerticalMetric x={-50} y={0} height={groupHeight} width={null} />
      )}
      {horizontalMetric && (
        <HorizontalMetric x={0} y={-50} height={null} width={groupWidth} />
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

          const radius = Math.min(cornerRadius, shapeWidth / 2, shapeHeight / 2)

          if (cornerPartLength) {
            //---
            ctx.moveTo(0, cornerPartLength)
            ctx.lineTo(shapeWidth, cornerPartLength)
          } else {
            ctx.moveTo(0, shapeHeight * (1 - OTK_ARMSREST_LENGTH_PERCETAGE))
            ctx.lineTo(
              shapeWidth,
              shapeHeight * (1 - OTK_ARMSREST_LENGTH_PERCETAGE)
            )
          }

          // Main body with rounded bottom corners if radius > 0
          if (radius > 0) {
            // Draw main rectangle with rounded bottom corners
            ctx.moveTo(0, 0)
            ctx.lineTo(shapeWidth, 0)
            ctx.lineTo(shapeWidth, shapeHeight - radius)
            ctx.arcTo(
              shapeWidth,
              shapeHeight,
              shapeWidth - radius,
              shapeHeight,
              radius
            )
            ctx.lineTo(radius, shapeHeight)
            ctx.arcTo(0, shapeHeight, 0, shapeHeight - radius, radius)
            ctx.lineTo(0, 0)
            ctx.closePath()
          } else {
            // Fallback to regular rectangle
            ctx.rect(0, 0, shapeWidth, shapeHeight)
          }

          ctx.fillStrokeShape(shape)

          ctx.moveTo(0, 0)
          ctx.lineTo(shapeBackrestWidth, shapeBackrestWidth)
          ctx.lineTo(
            shapeBackrestWidth,
            shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE + shapeBackrestWidth
          )
          ctx.lineTo(
            0,
            shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE + shapeBackrestWidth
          )
          ctx.moveTo(shapeBackrestWidth, shapeBackrestWidth)
          ctx.lineTo(shapeWidth, shapeBackrestWidth)
          ctx.moveTo(shapeWidth, shapeBackrestWidth)
          ctx.lineTo(shapeWidth, 0)

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
          // Draw shadow
          ctx.moveTo(
            shapeBackrestWidth + SHADOW_WIDTH - 2,
            shapeBackrestWidth + SHADOW_WIDTH - 2
          )
          ctx.lineTo(shapeWidth - 2, shapeBackrestWidth + SHADOW_WIDTH - 2)
          ctx.moveTo(
            shapeBackrestWidth + SHADOW_WIDTH - 2,
            shapeBackrestWidth + SHADOW_WIDTH - 2
          )
          ctx.lineTo(
            shapeBackrestWidth + SHADOW_WIDTH - 2,
            shapeBackrestWidth + shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE + 2
          )
          ctx.moveTo(
            shapeBackrestWidth + SHADOW_WIDTH + 1,
            shapeBackrestWidth + shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE + 4
          )
          ctx.lineTo(
            2,
            shapeBackrestWidth + shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE + 4
          )
          ctx.moveTo(
            SHADOW_WIDTH - 2,
            shapeBackrestWidth + shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE + 4
          )

          // ctx.moveTo(
          //   shapeWidth - SHADOW_WIDTH + 2,
          //   shapeBackrestWidth + SHADOW_WIDTH,
          // )ement same pil
          // ctx.lineTo(shapeWidth - SHADOW_WIDTH + 2, shapeHeight - 2)

          ctx.fillStrokeShape(shape)
        }}
        stroke={MAIN_SHAPE_SHADOW_COLOR}
        strokeWidth={SHADOW_WIDTH}
      />

      {/* BAKCREST PILLOW 1 */}
      <Group>
        {/* <Line
          x={0}
          y={0}
          // points={[0, 0, shapeWidth, 0, shapeWidth, shapeHeight]}  // RIGHT
          points={[
            shapeWidth - backPillowSize / 5,
            0 + shapeBackrestWidth + backPillowSize / 5,
            0 + shapeBackrestWidth + backPillowSize / 5,
            0 + shapeBackrestWidth + backPillowSize / 5,
            0 + shapeBackrestWidth + backPillowSize / 5,
            shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE -
              shapeBackrestWidth -
              backPillowSize / 5,
          ]}
          // tension={0.3}
          stroke="Purple"
          strokeWidth={4}
          fill={'#ddd'}
        /> */}
        {pillows.map((pillow, index) => {
          return (
            <Line
              key={index}
              x={pillow.x}
              y={pillow.y}
              rotation={pillow.rotation}
              offsetX={backPillowSize / 2}
              points={[
                0,
                0,
                backPillowSize / 2,
                -backPillowSize / 5,
                backPillowSize,
                0,
                backPillowSize / 2,
                backPillowSize / 5,
              ]}
              tension={0.3}
              closed
              // stroke="green"
              stroke="black"
              strokeWidth={1}
              fill={'#ddd'}
            />
          )
        })}
      </Group>

      {/* DEBUG POINTS - Red dots for debugging */}
      {/* <Group>
        {debugPoints.map((point, index) => (
          <Circle
            key={`debug-point-${index}`}
            x={point.x}
            y={point.y}
            radius={3}
            fill="red"
            stroke="darkred"
            strokeWidth={1}
          />
        ))}
      </Group> */}

      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo key={`gizmo-${index}`} settings={conn} />
        )
      )}
    </Group>
  )
}

export default OTKCMANYPILLOWL

//==== METHOD - EVENTLY SPACED PILLOWS
// const interpolatePoints = (points, numberOfPillows) => {
//   const totalLength =
//     Math.sqrt(
//       Math.pow(points[2] - points[0], 2) + Math.pow(points[3] - points[1], 2),
//     ) +
//     Math.sqrt(
//       Math.pow(points[4] - points[2], 2) + Math.pow(points[5] - points[3], 2),
//     )
//   const segmentLengths = [
//     Math.sqrt(
//       Math.pow(points[2] - points[0], 2) + Math.pow(points[3] - points[1], 2),
//     ),
//     Math.sqrt(
//       Math.pow(points[4] - points[2], 2) + Math.pow(points[5] - points[3], 2),
//     ),
//   ]

//   const interpolatedPoints = []
//   const pillowSpacing = totalLength / (numberOfPillows - 1)

//   for (let i = 0; i < numberOfPillows; i++) {
//     const targetLength = i * pillowSpacing
//     if (targetLength <= segmentLengths[0]) {
//       const t = targetLength / segmentLengths[0]
//       const x = points[0] + t * (points[2] - points[0])
//       const y = points[1] + t * (points[3] - points[1])
//       interpolatedPoints.push({ x, y, rotation: 0 })
//     } else {
//       const t = (targetLength - segmentLengths[0]) / segmentLengths[1]
//       const x = points[2] + t * (points[4] - points[2])
//       const y = points[3] + t * (points[5] - points[3])
//       interpolatedPoints.push({ x, y, rotation: 90 })
//     }
//   }

//   // Adjust rotation for the pillow closest to the junction point
//   const junctionIndex = Math.floor(segmentLengths[0] / pillowSpacing)
//   if (junctionIndex < interpolatedPoints.length) {
//     interpolatedPoints[junctionIndex].rotation = 145
//   }

//   return interpolatedPoints
// }

// useEffect(() => {
//   const points = [
//     shapeWidth - backPillowSize / 2,
//     0 + shapeBackrestWidth + backPillowSize / 5,
//     0 + shapeBackrestWidth + backPillowSize / 5,
//     0 + shapeBackrestWidth + backPillowSize / 5,
//     0 + shapeBackrestWidth + backPillowSize / 5,
//     shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE -
//       shapeBackrestWidth -
//       backPillowSize / 5,
//   ]

//   const numberOfPillows = backPillowNumber
//   const interpolatedPoints = interpolatePoints(points, numberOfPillows)

//   const newPillows = interpolatedPoints.map((pillow) => ({
//     x: pillow.x, // Adding the initial offset
//     y: pillow.y,
//     rotation: pillow.rotation,
//   }))

//   setPillows(newPillows)
// }, [backPillowNumber, backrestWidth])
