// DEPRECATED FILE. USE ANGLECORNERLCHR INSTEAD.

import React, { useCallback, useEffect, useState } from 'react'
import { Shape, Group, Rect, Circle, Image, Line } from 'react-konva'
import { haveIntersection } from '../utils'
import {
  ANGLE_CORNER_ANGLE,
  ARMS_REST_WIDTH,
  BACK_REST_WIDTH,
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
import { drawShapeLeft, drawShapeRight } from './ANGLECORNER'

const drawShapeLeftLCH = (
  ctx,
  shape,
  { shapeWidth, shapeHeight, shapeBackrestWidth, connectionAngle }
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
  ctx.lineTo(
    shapeWidth,
    shapeHeight -
      shapeHeight * Math.tan(angle) +
      shapeBackrestWidth * Math.tan(angle) // THIS IS THE MODIFICATION HERE
  )
  ctx.lineTo(shapeHeight * Math.tan(angle), shapeHeight)
  ctx.lineTo(shapeBackrestWidth * Math.tan(angle), shapeBackrestWidth)
  ctx.fillStrokeShape(shape)
}

const drawShapeRightLCH = (
  ctx,
  shape,
  { shapeWidth, shapeHeight, shapeBackrestWidth, connectionAngle }
) => {
  ctx.beginPath()
  ctx.moveTo(0, 0)
  const angle = ((connectionAngle / 2) * Math.PI) / 180 // Convert degrees to radians

  ctx.lineTo(shapeWidth, 0)
  ctx.lineTo(
    shapeWidth - shapeBackrestWidth * Math.tan(angle),
    shapeBackrestWidth
  )
  //ctx.lineTo(shapeWidth, shapeBackrestWidth)
  ctx.lineTo(0, shapeBackrestWidth)
  ctx.lineTo(0, 0)
  ctx.fillStrokeShape(shape)

  ctx.moveTo(0, shapeBackrestWidth)
  ctx.lineTo(
    shapeWidth - shapeBackrestWidth * Math.tan(angle),
    shapeBackrestWidth
  )
  ctx.lineTo(shapeWidth - shapeHeight * Math.tan(angle), shapeHeight)

  ctx.lineTo(0, shapeHeight)
  ctx.lineTo(0, shapeBackrestWidth)
  ctx.fillStrokeShape(shape)
}

const ANGLECORNERLCHPL = ({
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
  sizeOfPillow = null, // Width of pillow in cm
  ...props
}) => {
  //----

  const armOver = armrestWidthOverride ?? armrestWidth

  const shapeWidth = width + armOver - armrestWidth
  const shapeHeight = height

  const shapeArmrestWidth = armOver ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH
  const connectionAngle = angle ?? ANGLE_CORNER_ANGLE

  let pillowSize = sizeOfPillow ?? STANDART_PILLOW_SIZE

  let xOffset = x
  let yOffset = y

  let groupWidth = shapeWidth
  let groupHeight = shapeHeight

  const angleT = (connectionAngle * Math.PI) / 180 // Convert degrees to radians

  const angleLine = ((connectionAngle / 2) * Math.PI) / 180

  const cosAngle = Math.cos(angleT)
  const sinAngle = Math.sin(angleT)

  // Original vector

  // Calculate the width of the sofa single shape. There are two shapes where one is rotated by angleT
  const rotatedArmrestWidth = shapeArmrestWidth * cosAngle
  const singleShapeWidth =
    (shapeWidth - rotatedArmrestWidth) / (1 + Math.cos(angleT))
  // Apply rotation
  const rotatedWidth = singleShapeWidth * cosAngle
  const rotatedHeight = singleShapeWidth * sinAngle

  const connectors = [
    {
      type: 'right',
      x: singleShapeWidth + rotatedWidth + shapeArmrestWidth,
      y: rotatedHeight,
      rotation: connectionAngle,
    },
  ]

  //==== CALCULATING FOR THE EXTENDED SHAPE
  let X = singleShapeWidth - shapeHeight * Math.tan(angleLine)
  // angleT --- The angle
  let Y = Math.sin(angleT) * X
  let SX = Math.cos(angleT) * X
  let AX = X + SX
  let FullY = shapeHeight + Y

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
      type="ANGLECORNERLCHPL"
      x={xOffset}
      y={yOffset}
      originalWidth={width}
      originalHeight={height}
      dragBoundFunc={e => dragBound(e)}
      originalSofaForm={originalSofaForm}
      connectors={props.enabled_connectors == false ? [] : connectors}
      rotation={rotation}
      armrestPosition="L"
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
        width={singleShapeWidth + shapeArmrestWidth + rotatedWidth}
        height={rotatedHeight + shapeHeight * cosAngle}
      />

      <Shape
        x={singleShapeWidth + shapeArmrestWidth}
        y={0}
        //----
        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) =>
          drawShapeLeftLCH(ctx, shape, {
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
        x={shapeArmrestWidth}
        y={0}
        //----
        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) =>
          drawShapeRightLCH(ctx, shape, {
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

      <Rect // armrest
        x={0}
        y={0}
        width={shapeArmrestWidth}
        height={shapeHeight * LCH_ANGLE_ARMSREST_LENGTH_PERCETAGE}
        rotation={0}
        fill={MAIN_SHAPE_COLOR}
        stroke="black"
        strokeWidth={1}
      />

      {/* Line covering the middle line with shape color */}
      <Line
        x={shapeArmrestWidth}
        y={0}
        points={[
          singleShapeWidth - shapeBackrestWidth * Math.tan(angleLine),
          shapeBackrestWidth + 3,
          singleShapeWidth - shapeHeight * Math.tan(angleLine),
          shapeHeight - 1,
        ]}
        stroke={MAIN_SHAPE_COLOR}
        // stroke={'green'}
        strokeWidth={8}
      />

      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo key={`gizmo-${index}`} settings={conn} />
        )
      )}

      {/* CENTER PILLOW */}
      <Line
        x={shapeArmrestWidth + (singleShapeWidth - pillowSize) / 2}
        y={shapeBackrestWidth + pillowSize / 6}
        points={[
          0,
          0,
          pillowSize / 2,
          -pillowSize / 6,
          pillowSize,
          0,
          pillowSize / 2,
          pillowSize / 6,
        ]}
        tension={0.3}
        closed
        stroke="black"
        strokeWidth={1}
      />
    </Group>
  )
}

export default ANGLECORNERLCHPL

//  /* This is for TESTING TO UNDERSTAND THE LINES */
//  /* <Line
//   x={shapeArmrestWidth}
//   y={0}
//   points={[
//     0,
//     shapeBackrestWidth,

//     singleShapeWidth - shapeBackrestWidth * Math.tan(angleLine),
//     shapeBackrestWidth + 3,

//     singleShapeWidth - shapeHeight * Math.tan(angleLine),
//     shapeHeight,

//     0,
//     shapeHeight,
//     0,
//     shapeBackrestWidth,
//   ]}
//   // stroke={MAIN_SHAPE_COLOR}
//   stroke={'green'}
//   strokeWidth={10}
//   // rotation={connectionAngle}'
//   // fill={'red'}
// />

// <Line
//   x={singleShapeWidth + shapeArmrestWidth}
//   y={0}
//   points={[
//     shapeBackrestWidth * Math.tan(angleLine),
//     shapeBackrestWidth,
//     singleShapeWidth,
//     shapeBackrestWidth,
//     singleShapeWidth,
//     shapeHeight,
//     shapeHeight * Math.tan(angleLine),
//     shapeHeight,
//     shapeBackrestWidth * Math.tan(angleLine),
//     shapeBackrestWidth,
//   ]}
//   // stroke={MAIN_SHAPE_COLOR}
//   stroke={'green'}
//   strokeWidth={10}
//   rotation={connectionAngle}
//   // fill={'red'}
// /> */
