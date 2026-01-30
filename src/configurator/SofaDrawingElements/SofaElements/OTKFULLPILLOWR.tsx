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

import E from './E'
import Gizmo from '../Gizmo'

const OTKFULLPILLOWR = ({
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
  ...props
}) => {
  //----

  const shapeWidth = width
  const shapeHeight = height

  const shapeArmrestWidth = armrestWidth ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

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
    //--- PUF CONNECTORS
    // {
    //   type: 'right',
    //   x: shapeWidth,
    //   y: shapeHeight,
    //   rotation: 90,
    //   shapeType: 'PUF-RECEIVING',
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

  return (
    <Group
      id={id}
      draggable={draggable}
      name={'sofa_shape_group'}
      width={groupWidth}
      height={groupHeight}
      type="OTKFULLPILLOWR"
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

          ctx.moveTo(
            shapeWidth - shapeBackrestWidth,
            shapeHeight * (OTK_ARMSREST_LENGTH_PERCETAGE / 2) +
              shapeBackrestWidth,
          )
          ctx.lineTo(
            shapeWidth,
            shapeHeight * (OTK_ARMSREST_LENGTH_PERCETAGE / 2) +
              shapeBackrestWidth,
          )

          ctx.rect(0, 0, shapeWidth, shapeHeight)
          ctx.rect(
            shapeWidth - shapeArmrestWidth,
            0,
            shapeArmrestWidth,
            shapeBackrestWidth + shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE,
          )
          ctx.rect(0, 0, shapeWidth - shapeArmrestWidth, shapeBackrestWidth)
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
          ctx.moveTo(0 + 2, shapeBackrestWidth + SHADOW_WIDTH - 2)
          ctx.lineTo(
            shapeWidth - shapeArmrestWidth - 2,
            shapeBackrestWidth + SHADOW_WIDTH - 2,
          )

          ctx.moveTo(
            shapeWidth - shapeArmrestWidth - SHADOW_WIDTH + 2,
            shapeBackrestWidth + SHADOW_WIDTH - 2,
          )
          ctx.lineTo(
            shapeWidth - shapeArmrestWidth - SHADOW_WIDTH + 2,
            shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE +
              SHADOW_WIDTH +
              shapeBackrestWidth,
          )
          ctx.moveTo(
            shapeWidth - shapeArmrestWidth - SHADOW_WIDTH - 1,
            shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE +
              SHADOW_WIDTH +
              shapeBackrestWidth -
              2,
          )
          ctx.lineTo(
            shapeWidth - 1,
            shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE +
              SHADOW_WIDTH +
              shapeBackrestWidth -
              2,
          )
          ctx.moveTo(
            shapeWidth - 4,
            shapeHeight * OTK_ARMSREST_LENGTH_PERCETAGE +
              SHADOW_WIDTH +
              shapeBackrestWidth,
          )
          ctx.lineTo(shapeWidth - 4, shapeHeight - 1)

          ctx.fillStrokeShape(shape)
        }}
        stroke={MAIN_SHAPE_SHADOW_COLOR}
        strokeWidth={SHADOW_WIDTH}
      />
      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo key={`gizmo-${index}`} settings={conn} />
        ),
      )}
    </Group>
  )
}

export default OTKFULLPILLOWR
