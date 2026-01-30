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
  LCH_ARMSREST_LENGTH_PERCETAGE,
  MAIN_SHAPE_COLOR,
  MAIN_SHAPE_SHADOW_COLOR,
  METRIC_SIZE,
  OTK_ARMSREST_LENGTH_PERCETAGE,
  SHADOW_WIDTH,
} from './constants'
import { HorizontalMetric, VerticalMetric } from './MetricLines'
import Konva from 'konva'
// import RotateRightIcon from '@mui/icons-material/RotateRight'

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
      width: true,
      height: true,
      length: true,
      seat_height: false,
      corner_radius: true,
      // seat_depth: false,
      armrest_width: false,
      backrest_width: false,
      // corner_part_length: false,
      // mattress_width: false,
      // mattress_length: false,
      // fabric_usage: false,
    },
  }
}

// "/svg_icons/arrow-rotate-right-solid.svg"
// "/svg_icons/trash-solid.svg"
export const getDimensions = ({ shapeWidth, shapeHeight, angle }) => {
  return {
    armrestPosition: null,
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

const OTKCL = ({
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
  cornerRadius = 0,
  ...props
}) => {
  //----

  const shapeWidth = width
  const shapeHeight = height

  // === CORNER PART ====
  const cornerPartLength = props.cornerPartLength ?? null

  const shapeArmrestWidth = armrestWidth ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

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
      type="OTKCL"
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

          if (cornerPartLength) {
            //---
            ctx.moveTo(0, cornerPartLength)
            ctx.lineTo(shapeWidth, cornerPartLength)
          } else {
            ctx.moveTo(
              0,
              shapeHeight * (OTK_ARMSREST_LENGTH_PERCETAGE / 2) +
                shapeBackrestWidth
            )
            ctx.lineTo(
              shapeWidth,
              shapeHeight * (OTK_ARMSREST_LENGTH_PERCETAGE / 2) +
                shapeBackrestWidth
            )
          }

          // Create rectangle with rounded bottom corners
          const radius = Math.min(cornerRadius, shapeWidth / 2, shapeHeight / 2)

          if (radius > 0) {
            // Start from top-left corner
            ctx.moveTo(0, 0)
            // Top edge
            ctx.lineTo(shapeWidth, 0)
            // Right edge down to corner radius
            ctx.lineTo(shapeWidth, shapeHeight - radius)
            // Bottom-right rounded corner
            ctx.arcTo(
              shapeWidth,
              shapeHeight,
              shapeWidth - radius,
              shapeHeight,
              radius
            )
            // Bottom edge
            ctx.lineTo(radius, shapeHeight)
            // Bottom-left rounded corner
            ctx.arcTo(0, shapeHeight, 0, shapeHeight - radius, radius)
            // Left edge back to start
            ctx.lineTo(0, 0)
          } else {
            // Fallback to regular rectangle if no corner radius
            ctx.rect(0, 0, shapeWidth, shapeHeight)
          }

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
          // )
          // ctx.lineTo(shapeWidth - SHADOW_WIDTH + 2, shapeHeight - 2)

          ctx.fillStrokeShape(shape)
        }}
        stroke={MAIN_SHAPE_SHADOW_COLOR}
        strokeWidth={SHADOW_WIDTH}
      />
      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo key={`gizmo-${index}`} settings={conn} />
        )
      )}
    </Group>
  )
}

export default OTKCL
