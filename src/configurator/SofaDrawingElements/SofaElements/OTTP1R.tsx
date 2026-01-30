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

export const getDefaultSettings = () => {
  return {
    dimensions: {
      width: 100,
      length: 200,
      armrestPosition: '',
      corner_radius: 0,
    },
    changeableProperties: {
      backrest_width: true,
      width: true,
      height: true,
      length: true,
      number_of_big_pillows: true,
      // spread_of_big_pillows: true,
      size_of_big_pillow: true,
      corner_radius: true,
    },
  }
}

export const getDimensions = ({ shapeWidth, shapeHeight, angle }) => {
  return {
    armrestPosition: '',
    connectors: [
      {
        type: 'left',
        x: shapeWidth,
        y: 0,
        rotation: 90,
      },
    ],
  }
}

const OTTP1R = ({
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
  cornerRadius = 0,
  numberOfBigPillows = 0, // Number of big pillows
  ...props
}) => {
  //----

  const shapeWidth = width
  const shapeHeight = height

  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

  let pillowSize = sizeOfPillow ?? STANDART_PILLOW_SIZE

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

  return (
    <Group
      id={id}
      draggable={draggable}
      name={'sofa_shape_group'}
      width={groupWidth}
      height={groupHeight}
      type="OTTP1R"
      x={xOffset}
      y={yOffset}
      originalWidth={width}
      originalHeight={height}
      dragBoundFunc={e => dragBound(e)}
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

          const radius = Math.min(cornerRadius, shapeWidth / 2)

          if (radius > 0) {
            // Main body with rounded corners
            const mainX = 0
            const mainY = 0
            const mainWidth = shapeWidth
            const mainHeight = shapeHeight

            ctx.moveTo(mainX + radius, mainY)
            ctx.lineTo(mainX + mainWidth, mainY)
            // ctx.arcTo(
            //   mainX + mainWidth,
            //   mainY,
            //   mainX + mainWidth,
            //   mainY + radius,
            //   radius,
            // )
            ctx.lineTo(mainX + mainWidth, mainY + mainHeight - radius)
            ctx.arcTo(
              mainX + mainWidth,
              mainY + mainHeight,
              mainX + mainWidth - radius,
              mainY + mainHeight,
              radius
            )
            ctx.lineTo(mainX + radius, mainY + mainHeight)
            ctx.arcTo(
              mainX,
              mainY + mainHeight,
              mainX,
              mainY + mainHeight - radius,
              radius
            )
            ctx.lineTo(mainX, mainY)
            ctx.closePath()

            // Backrest with rounded bottom corners only
            if (backrestWidth > 0) {
              const backX = shapeWidth - shapeBackrestWidth
              const backY = 0
              const backWidth = shapeBackrestWidth
              const backHeight = shapeHeight / 1.6

              ctx.moveTo(backX, backY)
              ctx.lineTo(backX + backWidth, backY)
              ctx.lineTo(backX + backWidth, backY + backHeight)

              ctx.lineTo(backX, backY + backHeight)

              ctx.lineTo(backX, backY)
              ctx.closePath()
            }
          } else {
            // Fallback to regular rectangles
            ctx.rect(0, 0, shapeWidth, shapeHeight)
            ctx.rect(
              shapeWidth - shapeBackrestWidth,
              0,
              shapeBackrestWidth,
              shapeHeight / 1.6
            )
          }

          ctx.fillStrokeShape(shape)
        }}
        stroke="black"
        strokeWidth={1}
        name={'sofa_shape'}
      />

      {backrestWidth > 0 && (
        <Shape
          // --- Drawing shadows, on top of shape
          offsetX={shapeWidth / 2}
          offsetY={shapeHeight / 2}
          // We need to set x, y, origin in center
          x={shapeWidth / 2 + shapeOffsetFix}
          y={shapeHeight / 2 - 4}
          //----
          fill={MAIN_SHAPE_COLOR}
          sceneFunc={(ctx, shape) => {
            ctx.beginPath()
            // Draw shadow
            ctx.moveTo(
              shapeWidth - (shapeBackrestWidth + SHADOW_WIDTH - 2),
              0 + SHADOW_WIDTH - 2
            )
            ctx.lineTo(
              shapeWidth - (shapeBackrestWidth + SHADOW_WIDTH - 2),
              shapeHeight / 1.6 + SHADOW_WIDTH
            )
            ctx.moveTo(
              shapeWidth - (shapeBackrestWidth + 2),
              shapeHeight / 1.6 + SHADOW_WIDTH
            )
            ctx.lineTo(shapeWidth, shapeHeight / 1.6 + SHADOW_WIDTH)
            ctx.fillStrokeShape(shape)
          }}
          stroke={MAIN_SHAPE_SHADOW_COLOR}
          strokeWidth={SHADOW_WIDTH}
        />
      )}
      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo key={`gizmo-${index}`} settings={conn} />
        )
      )}

      {/* VeERTICAL PILLOW */}
      {numberOfBigPillows > 0 && (
        <Line
          x={shapeWidth - shapeBackrestWidth - pillowSize / 2}
          y={shapeHeight / 1.6 / 5}
          points={[
            pillowSize / 6,
            0,
            pillowSize / 2.5,
            pillowSize / 2,
            pillowSize / 6,
            pillowSize,
            0,
            pillowSize / 2,
          ]}
          tension={0.3}
          closed
          stroke="black"
          strokeWidth={1}
        />
      )}
    </Group>
  )
}

export default OTTP1R
