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
  SHADOW_WIDTH,
} from './constants'
import { HorizontalMetric, VerticalMetric } from './MetricLines'
import Konva from 'konva'

import Gizmo from '../Gizmo'

const PUF = ({
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

  //---

  const shapeWidth = width
  const shapeHeight = height

  const shapeArmrestWidth = armrestWidth ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

  let xOffset = x
  let yOffset = y

  let groupWidth = shapeWidth
  let groupHeight = shapeHeight

  let shapeOffsetFix = 0

  // --- Originial connectors
  //  const connectors = [
  //  {
  //    type: 'left',
  //    x: 0,
  //    y: 0,
  //    rotation: 0,
  //  },

  //  {
  //    type: 'right',
  //    x: shapeWidth,
  //    y: 0,
  //    rotation: 0,
  //  },
  //  ]

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
    //---- PUUF CLASS CONNECTORS
    // {
    //   type: 'right',
    //   x: 0,
    //   y: 0,
    //   rotation: 270,
    //   shapeType: 'PUF',
    // },
    // {
    //   type: 'right',
    //   x: shapeWidth,
    //   y: 0,
    //   rotation: 0,
    //   shapeType: 'PUF',
    // },
    // {
    //   type: 'left',
    //   x: 0,
    //   y: shapeHeight,
    //   rotation: -90,
    //   shapeType: 'PUF',
    // },
    // {
    //   type: 'left',
    //   x: 0,
    //   y: 0,
    //   rotation: 0,
    //   shapeType: 'PUF',
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
      type="PUF"
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
          var x = 0
          var y = 0
          var w = shapeWidth
          var h = shapeHeight
          var r = x + w
          var b = y + h
          var radius = 10
          ctx.beginPath()

          //   ctx.rect(0, 0, shapeWidth, shapeHeight) // --- > Rectangle

          ctx.moveTo(x + radius, y)
          ctx.lineTo(r - radius, y)
          ctx.quadraticCurveTo(r, y, r, y + radius)
          ctx.lineTo(r, y + h - radius)
          ctx.quadraticCurveTo(r, b, r - radius, b)
          ctx.lineTo(x + radius, b)
          ctx.quadraticCurveTo(x, b, x, b - radius)
          ctx.lineTo(x, y + radius)
          ctx.quadraticCurveTo(x, y, x + radius, y)
          ctx.stroke()

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
    </Group>
  )
}

export default PUF
