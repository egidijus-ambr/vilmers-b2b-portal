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
  ANGLE_RADIUS,
  ARMS_REST_WIDTH,
  BACKREST_PILLOW_SIZE,
  BACK_REST_WIDTH,
  CURVER_ANGLE_RADIUS,
  INSIDE_BACKREST_MARGIN_PERCENTAGE,
  MAIN_SHAPE_COLOR,
  MAIN_SHAPE_SHADOW_COLOR,
  METRIC_SIZE,
  SHADOW_WIDTH,
  STANDART_PILLOW_SIZE,
  PILLOW_FILL_COLOR,
  PILLOW_STROKE_COLOR,
  PILLOW_STROKE_WIDTH,
} from './constants'
import { HorizontalMetric, VerticalMetric } from './MetricLines'
import Konva from 'konva'

import Gizmo from '../Gizmo'
import { rectangleWithRoundEnd } from './customShapes'

const OTTCURVEFULLINSIDEMANYPILLOWL = ({
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

  numberOfBigPillows = null,
  numberOfSmallPillows = null,
  spreadOfBigPillows = null,
  spreadOfSmallPillows = null,
  sizeOfPillow = null, // Width of pillow in cm
  sizeOfBigPillow = null, // Width of pillow in cm

  ...props
}) => {
  //----

  const shapeWidth = width
  const shapeHeight = height

  const shapeArmrestWidth = armrestWidth ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

  const borderAdjustmentMarginWidth =
    shapeWidth * INSIDE_BACKREST_MARGIN_PERCENTAGE
  const borderAdjustmentMarginHeight =
    shapeWidth * INSIDE_BACKREST_MARGIN_PERCENTAGE // WE ONLY USE WIDTH

  //=== Pillows
  let pillowSize = sizeOfPillow ?? STANDART_PILLOW_SIZE
  let backPillowSize = sizeOfBigPillow ?? BACKREST_PILLOW_SIZE
  let backPillowNumber = numberOfBigPillows ?? 3

  let xOffset = x
  let yOffset = y

  let groupWidth = shapeWidth
  let groupHeight = shapeHeight

  let shapeOffsetFix = 0

  const connectors = [
    // {
    //   type: 'right',
    //   x: 0,
    //   y: 0,
    //   rotation: -90,
    // },
  ]

  // A function that limits exit of View zone
  const dragBound = (e) => {
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

  const interpolatePoints = (points, numberOfPillows, pillowSpacing) => {
    const segmentLengths = [
      Math.sqrt(
        Math.pow(points[2] - points[0], 2) + Math.pow(points[3] - points[1], 2),
      ),
      Math.sqrt(
        Math.pow(points[4] - points[2], 2) + Math.pow(points[5] - points[3], 2),
      ),
    ]

    const totalLength = segmentLengths[0] + segmentLengths[1]
    const interpolatedPoints = []
    let currentLength = 0

    // First segment
    while (
      currentLength <= segmentLengths[0] &&
      interpolatedPoints.length < numberOfPillows
    ) {
      const t = currentLength / segmentLengths[0]
      const x = points[0] + t * (points[2] - points[0])
      const y = points[1] + t * (points[3] - points[1])
      interpolatedPoints.push({ x, y, rotation: 0 })
      currentLength += pillowSpacing
    }

    // Second segment
    currentLength -= segmentLengths[0]
    while (interpolatedPoints.length < numberOfPillows) {
      const t = currentLength / segmentLengths[1]
      const x = points[2] + t * (points[4] - points[2])
      const y = points[3] + t * (points[5] - points[3])
      interpolatedPoints.push({ x, y, rotation: 90 })
      currentLength += pillowSpacing
    }

    // Ensure the last pillow is included if it's not already
    if (interpolatedPoints.length < numberOfPillows) {
      interpolatedPoints.push({
        x: points[4],
        y: points[5],
        rotation: 90,
      })
    }

    // Adjust rotation for the pillow closest to the junction point
    const junctionIndex = Math.floor(segmentLengths[0] / pillowSpacing)
    if (junctionIndex < interpolatedPoints.length && junctionIndex !== 0) {
      interpolatedPoints[junctionIndex].rotation = 145
      interpolatedPoints[junctionIndex].x += backPillowSize / 10
      interpolatedPoints[junctionIndex].y += backPillowSize / 10
    }

    // Ensure there is always at least one point
    if (interpolatedPoints.length === 0) {
      interpolatedPoints.push({
        x: points[0],
        y: points[1],
        rotation: 0,
      })
    }

    return interpolatedPoints
  }

  useEffect(() => {
    const points = [
      shapeWidth - borderAdjustmentMarginWidth - +backPillowSize / 2,
      shapeBackrestWidth + borderAdjustmentMarginHeight + backPillowSize / 5,

      borderAdjustmentMarginWidth + shapeBackrestWidth + backPillowSize / 5,
      borderAdjustmentMarginHeight + shapeBackrestWidth + backPillowSize / 5,

      shapeBackrestWidth + borderAdjustmentMarginHeight + +backPillowSize / 5,
      shapeHeight / 1.6 - backPillowSize / 2,
    ]

    const interpolatedPoints = interpolatePoints(
      points,
      numberOfPillows,
      pillowSpacing,
    )

    const newPillows = interpolatedPoints.map((pillow) => ({
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
      type="OTTCURVEFULLINSIDEMANYPILLOWL"
      x={xOffset}
      y={yOffset}
      originalWidth={width}
      originalHeight={height}
      dragBoundFunc={(e) => dragBound(e)}
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
        //----
        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) => {
          rectangleWithRoundEnd(ctx, shapeWidth, shapeHeight)
          ctx.fillStrokeShape(shape)
        }}
        stroke="black"
        strokeWidth={1}
        name={'sofa_shape'}
      />
      <Shape
        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath()

          ctx.rect(
            borderAdjustmentMarginWidth,
            borderAdjustmentMarginHeight,
            shapeBackrestWidth,
            shapeHeight / 1.6 - borderAdjustmentMarginHeight,
          )
          ctx.rect(
            borderAdjustmentMarginWidth,
            borderAdjustmentMarginHeight,
            shapeWidth - borderAdjustmentMarginWidth * 2,
            shapeBackrestWidth,
          )

          ctx.fillStrokeShape(shape)
        }}
        stroke="black"
        strokeWidth={1}
      />

      {/* BAKCREST PILLOW 1 */}
      <Group>
        {/* <Line
          x={0}
          y={0}
          points={[
            shapeWidth - borderAdjustmentMarginWidth - +backPillowSize / 2,
            shapeBackrestWidth +
              borderAdjustmentMarginHeight +
              backPillowSize / 5,

            borderAdjustmentMarginWidth +
              shapeBackrestWidth +
              backPillowSize / 5,
            borderAdjustmentMarginHeight +
              shapeBackrestWidth +
              backPillowSize / 5,

            shapeBackrestWidth +
              borderAdjustmentMarginHeight +
              +backPillowSize / 5,
            shapeHeight / 1.6 - backPillowSize / 2,
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
              stroke={PILLOW_STROKE_COLOR}
              strokeWidth={PILLOW_STROKE_WIDTH}
              fill={PILLOW_FILL_COLOR}
            />
          )
        })}
      </Group>

      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo key={`gizmo-${index}`} settings={conn} />
        ),
      )}
    </Group>
  )
}

export default OTTCURVEFULLINSIDEMANYPILLOWL
