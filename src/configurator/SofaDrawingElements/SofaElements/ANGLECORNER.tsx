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
  ANGLE_CORNER_ANGLE,
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

export const drawShapeLeft = (
  ctx,
  shape,
  { shapeWidth, shapeHeight, shapeBackrestWidth, connectionAngle },
) => {
  ctx.beginPath()
  ctx.moveTo(0, 0)
  const angle = ((connectionAngle / 2) * Math.PI) / 180 // Convert degrees to radians

  ctx.lineTo(shapeWidth, 0)
  ctx.lineTo(shapeWidth, shapeBackrestWidth)
  ctx.lineTo(shapeBackrestWidth * Math.tan(angle), shapeBackrestWidth)
  ctx.lineTo(0, 0)
  ctx.fillStrokeShape(shape)

  ctx.moveTo(shapeBackrestWidth * Math.tan(angle), shapeBackrestWidth)
  ctx.lineTo(shapeWidth, shapeBackrestWidth)
  ctx.lineTo(shapeWidth, shapeHeight)
  ctx.lineTo(shapeHeight * Math.tan(angle), shapeHeight)
  ctx.lineTo(shapeBackrestWidth * Math.tan(angle), shapeBackrestWidth)
  ctx.fillStrokeShape(shape)
}

export const drawShapeRight = (
  ctx,
  shape,
  { shapeWidth, shapeHeight, shapeBackrestWidth, connectionAngle },
) => {
  ctx.beginPath()
  ctx.moveTo(0, 0)
  const angle = ((connectionAngle / 2) * Math.PI) / 180 // Convert degrees to radians

  ctx.lineTo(shapeWidth, 0)
  ctx.lineTo(
    shapeWidth - shapeBackrestWidth * Math.tan(angle),
    shapeBackrestWidth,
  )
  //ctx.lineTo(shapeWidth, shapeBackrestWidth)
  ctx.lineTo(0, shapeBackrestWidth)
  ctx.lineTo(0, 0)
  ctx.fillStrokeShape(shape)

  ctx.moveTo(0, shapeBackrestWidth)
  ctx.lineTo(
    shapeWidth - shapeBackrestWidth * Math.tan(angle),
    shapeBackrestWidth,
  )
  ctx.lineTo(shapeWidth - shapeHeight * Math.tan(angle), shapeHeight)

  ctx.lineTo(0, shapeHeight)
  ctx.lineTo(0, shapeBackrestWidth)
  ctx.fillStrokeShape(shape)
}

export const getDefaultSettings = () => {
  return {
    dimensions: {
      width: 160,
      length: 110,
      armrestPosition: '',
      angle: 35,
      number_of_big_pillows: 1,
    },
    changeableProperties: {
      width: true,
      height: true,
      length: true,
      backrest_width: true,
      angle: true,
      armrest_width: true,
    },
  }
}

export const getDimensions = ({ shapeWidth, shapeHeight, angle }) => {
  const connectionAngle = angle ?? ANGLE_CORNER_ANGLE
  const angleT = (connectionAngle * Math.PI) / 180 // Convert degrees to radians

  const cosAngle = Math.cos(angleT)
  const sinAngle = Math.sin(angleT)
  const singleShapeWidth = shapeWidth / (1 + Math.cos(angleT))
  // Apply rotation
  const rotatedWidth = singleShapeWidth * cosAngle
  const rotatedHeight = singleShapeWidth * sinAngle

  return {
    armrestPosition: '',
    connectors: [
      {
        type: 'right',
        x: singleShapeWidth + rotatedWidth + 0,
        y: rotatedHeight,
        rotation: angle,
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

const ANGLECORNER = ({
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
  ...props
}) => {
  //----

  const shapeWidth = width
  const shapeHeight = height

  const shapeArmrestWidth = armrestWidth ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH
  const connectionAngle = angle ?? ANGLE_CORNER_ANGLE

  let xOffset = x
  let yOffset = y

  let groupWidth = shapeWidth
  let groupHeight = shapeHeight

  let shapeOffsetFix = 0

  const angleT = (connectionAngle * Math.PI) / 180 // Convert degrees to radians

  const cosAngle = Math.cos(angleT)
  const sinAngle = Math.sin(angleT)

  // Original vector

  // Calculate the width of the sofa single shape. There are two shapes where one is rotated by angleT
  const singleShapeWidth = shapeWidth / (1 + Math.cos(angleT))
  // Apply rotation
  const rotatedWidth = singleShapeWidth * cosAngle
  const rotatedHeight = singleShapeWidth * sinAngle

  const angleCT = ((connectionAngle / 2) * Math.PI) / 180
  const heightAddition =
    (singleShapeWidth - shapeHeight * Math.tan(angleCT)) * sinAngle

  // const connectors = [
  //   {
  //     type: 'left',
  //     x: 0,
  //     y: 0,
  //     rotation: 0,
  //   },
  //   {
  //     type: 'right',
  //     x: singleShapeWidth + rotatedWidth,
  //     y: rotatedHeight,
  //     rotation: connectionAngle,
  //   },
  // ]

  const dimensions = getDimensions({
    shapeWidth,
    shapeHeight,
    angle: connectionAngle,
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

  return (
    <Group
      id={id}
      draggable={draggable}
      name={'sofa_shape_group'}
      width={groupWidth}
      height={groupHeight}
      type="ANGLECORNER"
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
        height={shapeHeight + heightAddition}
        // fill="red"
      />
      <Shape
        x={singleShapeWidth}
        y={0}
        //----

        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) =>
          drawShapeLeft(ctx, shape, {
            shapeWidth: singleShapeWidth,
            shapeHeight,
            shapeBackrestWidth,
            connectionAngle,
          })
        }
        stroke="black"
        strokeWidth={1}
        name={'sofa_shape'}
        rotation={connectionAngle}
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
          drawShapeRight(ctx, shape, {
            shapeWidth: singleShapeWidth,
            shapeHeight,
            shapeBackrestWidth,
            connectionAngle,
          })
        }
        stroke="black"
        strokeWidth={1}
        name={'sofa_shape'}
      />

      {/* <Shape
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
          ctx.moveTo(0 + 2, shapeBackrestWidth + SHADOW_WIDTH - 2)
          ctx.lineTo(shapeWidth - 2, shapeBackrestWidth + SHADOW_WIDTH - 2)

          ctx.fillStrokeShape(shape)
        }}
        stroke={MAIN_SHAPE_SHADOW_COLOR}
        strokeWidth={SHADOW_WIDTH}
      /> */}
      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => <Gizmo key={`gizmo-${index}`} settings={conn} />,
      )}
    </Group>
  )
}

export default ANGLECORNER
