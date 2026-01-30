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
  MAIN_SHAPE_COLOR,
  MAIN_SHAPE_SHADOW_COLOR,
  METRIC_SIZE,
  SHADOW_WIDTH,
  STANDART_PILLOW_SIZE,
} from './constants'
import { HorizontalMetric, VerticalMetric } from './MetricLines'
import Konva from 'konva'

import Gizmo from '../Gizmo'

const OA3P = ({
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
  sizeOfPillow = null, // Width of pillow in cm
  ...props
}) => {
  //----

  //---

  const shapeWidth = width
  const shapeHeight = height

  const shapeArmrestWidth = armrestWidth ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

  let pillowSize = sizeOfPillow ?? STANDART_PILLOW_SIZE

  let xOffset = x
  let yOffset = y

  let groupWidth = shapeWidth
  let groupHeight = shapeHeight

  let shapeOffsetFix = 0

  const connectors = [
    {
      type: 'left',
      x: 0,
      y: 0,
      rotation: 0,
    },
    {
      type: 'right',
      x: shapeWidth,
      y: 0,
      rotation: 0,
    },
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

  return (
    <Group
      id={id}
      draggable={draggable}
      name={'sofa_shape_group'}
      width={groupWidth}
      height={groupHeight}
      type="OA3P"
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
        // ---
        offsetX={shapeWidth / 2}
        offsetY={shapeHeight / 2}
        // We need to set x, y, origin in center
        x={shapeWidth / 2 + shapeOffsetFix}
        y={shapeHeight / 2 - shapeOffsetFix}
        //----

        // fill="rgba(0,0,0,0.1)"
        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath()
          ctx.moveTo(shapeWidth / 3, 0)
          ctx.lineTo(shapeWidth / 3, shapeHeight)

          ctx.moveTo((shapeWidth / 3) * 2, 0)
          ctx.lineTo((shapeWidth / 3) * 2, shapeHeight)

          ctx.rect(0, 0, shapeWidth, shapeHeight)
          // ctx.rect(0, 0, shapeBackrestWidth, shapeHeight)
          ctx.rect(0, 0, shapeWidth, shapeBackrestWidth)
          ctx.fillStrokeShape(shape)
        }}
        stroke="black"
        strokeWidth={1}
        name={'sofa_shape'}
      />

      {/* <Line
        x={20}
        y={200}
        points={[0, 0, 50, -25, 100, 0, 50, 25]}
        tension={0.3}
        closed
        stroke="black"
      /> */}

      {/* <Rect
        x={50} // X position of the rectangle
        y={50} // Y position of the rectangle
        width={pillowWidth} // Width of the rectangle
        height={20} // Height of the rectangle
        // fillLinearGradientStartPoint={{ x: 0, y: 0 }} // Start point of gradient
        // fillLinearGradientEndPoint={{ x: 200, y: 100 }} // End point of gradient
        // fillLinearGradientColorStops={[0, 'red', 1, 'yellow']} // Color stops for gradient
        cornerRadius={50} // Rounded corners to create a pillow effect
        stroke="black" // Border color
        strokeWidth={4} // Border width
      /> */}

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
          ctx.moveTo(0 + 2, shapeBackrestWidth + SHADOW_WIDTH - 2)
          ctx.lineTo(shapeWidth - 2, shapeBackrestWidth + SHADOW_WIDTH - 2)

          ctx.fillStrokeShape(shape)
        }}
        stroke={MAIN_SHAPE_SHADOW_COLOR}
        strokeWidth={SHADOW_WIDTH}
      />
      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo
            key={`gizmo-${index}`}
            settings={conn}
            // shapeRotation={rotation}

            shapeHeight={shapeHeight}
            shapeWidth={shapeWidth}
          />
        ),
      )}

      {/* CENTER PILLOW */}
      {/* <Line
        x={pillowSize * 1.55 + 10}
        y={shapeBackrestWidth + pillowSize / 5}
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
      /> */}

      {/* CENTER PILLOW */}
      <Line
        x={shapeWidth / 3 + (shapeWidth / 3 - pillowSize) / 2}
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

export default OA3P
