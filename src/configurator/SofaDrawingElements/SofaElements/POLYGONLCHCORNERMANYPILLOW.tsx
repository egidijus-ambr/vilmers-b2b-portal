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
import { haveIntersection } from '../utils'
import {
  ANGLE_RADIUS,
  ARMS_REST_WIDTH,
  BACKREST_PILLOW_SIZE,
  BACK_REST_WIDTH,
  MAIN_SHAPE_COLOR,
  MAIN_SHAPE_SHADOW_COLOR,
  METRIC_SIZE,
  POLYGON_ANGLE,
  POLYGON_CUT_PERCENTAGE,
  POLYGON_LCH_CUT_PERCENTAGE,
  SHADOW_WIDTH,
  STANDART_PILLOW_SIZE,
  PILLOW_FILL_COLOR,
  PILLOW_STROKE_COLOR,
  PILLOW_STROKE_WIDTH,
} from './constants'
import { HorizontalMetric, VerticalMetric } from './MetricLines'
import Konva from 'konva'

import Gizmo from '../Gizmo'

// SMALL PILLOWS ARE NOT SUPPORTED HERE !!!

export const getDimensions = ({ shapeWidth, shapeHeight, angle }) => {
  return {
    armrestPosition: null,
    connectors: [
      {
        type: 'left',
        x: 0,
        y: shapeHeight,
        rotation: -90,
      },
      {
        type: 'right',
        x: shapeWidth,
        y: 0,
        rotation: 0,
      },
    ],
  }
}

const POLYGONLCHCORNERMANYPILLOW = ({
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

  //---

  const shapeWidth = width
  const shapeHeight = height

  const shapeArmrestWidth = armrestWidth ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

  //=== Pillows
  let pillowSize = sizeOfPillow ?? STANDART_PILLOW_SIZE
  let backPillowSize = sizeOfBigPillow ?? BACKREST_PILLOW_SIZE

  // let backPillowNumberStandart = Math.floor((shapeWidth + 10) / backPillowSize)
  let backPillowNumber = numberOfBigPillows ?? 5

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
  const interpolatePoints = (points, numberOfPoints) => {
    const interpolatedPoints = []
    for (let i = 0; i < numberOfPoints; i++) {
      const t = i / (numberOfPoints - 1)
      const x =
        points[0] * (1 - t) * (1 - t) * (1 - t) +
        3 * points[2] * t * (1 - t) * (1 - t) +
        3 * points[4] * t * t * (1 - t) +
        points[6] * t * t * t
      const y =
        points[1] * (1 - t) * (1 - t) * (1 - t) +
        3 * points[3] * t * (1 - t) * (1 - t) +
        3 * points[5] * t * t * (1 - t) +
        points[7] * t * t * t
      interpolatedPoints.push({ x, y })
    }
    return interpolatedPoints
  }

  const [pillows, setPillows] = useState([])

  useEffect(() => {
    const points = [
      backrestWidth + backPillowSize / 5,
      shapeHeight - backPillowSize / 2,
      backrestWidth + backPillowSize / 5,
      shapeHeight * POLYGON_LCH_CUT_PERCENTAGE,
      shapeWidth * POLYGON_LCH_CUT_PERCENTAGE,
      backrestWidth + backPillowSize / 10,
      shapeWidth - backPillowSize / 5,
      backrestWidth + backPillowSize / 5,
    ]

    const numberOfPillows = backPillowNumber
    const interpolatedPoints = interpolatePoints(points, numberOfPillows)

    const newPillows = []
    for (let i = 0; i < interpolatedPoints.length - 1; i++) {
      const p1 = interpolatedPoints[i]
      const p2 = interpolatedPoints[i + 1]
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
      newPillows.push({
        x: p1.x, // Adding the initial offset
        y: p1.y,
        rotation: angle,
      })
    }
    // Add the last pillow at the last interpolated point
    const lastPoint = interpolatedPoints[interpolatedPoints.length - 1]
    newPillows.push({
      x: lastPoint.x - backPillowSize / 5,
      y: lastPoint.y,
      rotation: newPillows[newPillows.length - 1]?.rotation || 0,
    })

    setPillows(newPillows)

    //---------
  }, [backPillowNumber, backrestWidth])

  return (
    <Group
      id={id}
      draggable={draggable}
      name={'sofa_shape_group'}
      width={groupWidth}
      height={groupHeight}
      type="POLYGONLCHCORNERMANYPILLOW"
      x={xOffset}
      y={yOffset}
      originalWidth={width}
      originalHeight={height}
      dragBoundFunc={(e) => dragBound(e)}
      originalSofaForm={originalSofaForm}
      connectors={props.enabled_connectors == false ? [] : connectors}
      rotation={rotation}
      armrestPosition={dimensions.armrestPosition}
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

          // --- Lines for backrest
          ctx.moveTo(shapeWidth, shapeBackrestWidth)
          ctx.lineTo(
            shapeWidth -
              shapeWidth * (1 - POLYGON_LCH_CUT_PERCENTAGE) +
              shapeBackrestWidth / 2,
            shapeBackrestWidth,
          )
          ctx.lineTo(
            0 + shapeBackrestWidth,
            shapeHeight * POLYGON_LCH_CUT_PERCENTAGE + shapeBackrestWidth / 2,
          )
          ctx.lineTo(0 + shapeBackrestWidth, shapeHeight)

          // Rectangle itself
          ctx.moveTo(shapeWidth, 0)
          ctx.lineTo(
            shapeWidth - shapeWidth * (1 - POLYGON_LCH_CUT_PERCENTAGE),
            0,
          )
          ctx.lineTo(0, shapeHeight * POLYGON_LCH_CUT_PERCENTAGE)
          ctx.lineTo(0, shapeHeight)
          ctx.lineTo(shapeWidth * (1 - POLYGON_ANGLE), shapeHeight)
          ctx.lineTo(shapeWidth, shapeHeight * (1 - POLYGON_ANGLE))
          ctx.lineTo(shapeWidth, 0)

          // Lines in middle of BACKREST
          ctx.moveTo(0, shapeHeight * POLYGON_LCH_CUT_PERCENTAGE)
          ctx.lineTo(
            shapeBackrestWidth,
            shapeHeight * POLYGON_LCH_CUT_PERCENTAGE + shapeBackrestWidth / 2,
          )
          ctx.moveTo(
            shapeWidth - shapeWidth * (1 - POLYGON_LCH_CUT_PERCENTAGE),
            0,
          )
          ctx.lineTo(
            shapeWidth -
              shapeWidth * (1 - POLYGON_LCH_CUT_PERCENTAGE) +
              shapeBackrestWidth / 2,
            shapeBackrestWidth,
          )

          ctx.fillStrokeShape(shape)
        }}
        stroke="black"
        strokeWidth={1}
        name={'sofa_shape'}
      />

      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo key={`gizmo-${index}`} settings={conn} />
        ),
      )}

      {/* BAKCREST PILLOW 1 */}
      <Group>
        {/* <Line
          ref={lineRef}
          x={0}
          y={0}
          points={[
            // 0,
            // shapeHeight,
            // 0,
            // shapeHeight * POLYGON_LCH_CUT_PERCENTAGE,
            // shapeWidth * POLYGON_LCH_CUT_PERCENTAGE,
            // 0,
            // shapeWidth,
            // 0,

            backrestWidth + backPillowSize / 5,
            shapeHeight - backPillowSize / 2,

            backrestWidth + backPillowSize / 5,
            backrestWidth +
              backPillowSize / 5 +
              shapeHeight * POLYGON_LCH_CUT_PERCENTAGE,

            backrestWidth +
              backPillowSize / 5 +
              shapeWidth * POLYGON_LCH_CUT_PERCENTAGE,
            backrestWidth + backPillowSize / 5,

            shapeWidth - backPillowSize / 2,
            backrestWidth + backPillowSize / 5,
          ]}
          tension={0.3}
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
    </Group>
  )
}

export default POLYGONLCHCORNERMANYPILLOW
