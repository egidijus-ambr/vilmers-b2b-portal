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

const SOFA2MANYPILLOW = ({
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
  armrestWidthOverride = null,

  numberOfBigPillows = null,
  numberOfSmallPillows = null,
  spreadOfBigPillows = null,
  spreadOfSmallPillows = null,
  sizeOfPillow = null, // Width of pillow in cm
  sizeOfBigPillow = null, // Width of pillow in cm

  ...props
}) => {
  //----

  const armOver = armrestWidthOverride ?? armrestWidth

  const shapeWidth = width + armOver * 2 - armrestWidth * 2
  const shapeHeight = height

  const shapeArmrestWidth = armOver ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

  let pillowSize = sizeOfPillow ?? STANDART_PILLOW_SIZE
  let backPillowSize = sizeOfBigPillow ?? BACKREST_PILLOW_SIZE

  //=== Pillows
  let backPillowNumberStandart = Math.floor((shapeWidth + 10) / backPillowSize)
  let backPillowNumber = numberOfBigPillows ?? backPillowNumberStandart
  let smallPillowNumber =
    numberOfSmallPillows != null ? numberOfSmallPillows : 2

  let shapeSpreadOfBigPillows = spreadOfBigPillows ?? 0 // Adds distance between pillows

  // let shapeSpreadOfBigPillows = -10

  let shapeSpreadOfSmallPillows = spreadOfSmallPillows ?? 0 // Adds distance between pillows

  let backPillowTotalWidth =
    (backPillowNumber * backPillowSize +
      (backPillowNumber - 1) * shapeSpreadOfBigPillows) /
    1.1 // We add the 1.2 due to rotation
  let backPillowCenterMargin = (shapeWidth - backPillowTotalWidth) / 2
  backPillowCenterMargin =
    backPillowCenterMargin < 0 ? 0 : backPillowCenterMargin

  let smallPillowTotalWidth =
    smallPillowNumber * pillowSize +
    (smallPillowNumber - 1) * shapeSpreadOfSmallPillows

  let smallPillowCenterMargin = (shapeWidth - smallPillowTotalWidth) / 2
  smallPillowCenterMargin =
    smallPillowCenterMargin < 0 ? 0 : smallPillowCenterMargin
  //--------------

  let xOffset = x
  let yOffset = y

  let groupWidth = shapeWidth
  let groupHeight = shapeHeight

  let shapeOffsetFix = 0

  const connectors = []

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
      type="SOFA2MANYPILLOW"
      x={xOffset}
      y={yOffset}
      originalWidth={width}
      originalHeight={height}
      dragBoundFunc={(e) => dragBound(e)}
      originalSofaForm={originalSofaForm}
      connectors={props.enabled_connectors == false ? [] : connectors}
      rotation={rotation}
      armrestPosition="LR"
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

          ctx.moveTo(shapeWidth / 2, 0)
          ctx.lineTo(shapeWidth / 2, shapeHeight)

          ctx.rect(0, 0, shapeWidth, shapeHeight)
          // ctx.rect(0, 0, BACK_REST_WIDTH, shapeHeight)
          ctx.rect(
            shapeArmrestWidth,
            0,
            shapeWidth - shapeArmrestWidth * 2,
            shapeBackrestWidth,
          )

          ctx.rect(
            shapeWidth - shapeArmrestWidth,
            0,
            shapeArmrestWidth,
            shapeHeight,
          )

          ctx.rect(
            shapeArmrestWidth,
            0,
            shapeWidth - shapeArmrestWidth,
            shapeHeight,
          )

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
            shapeArmrestWidth + 2,
            shapeBackrestWidth + SHADOW_WIDTH - 2,
          )
          ctx.lineTo(
            shapeWidth - shapeArmrestWidth - 2,
            shapeBackrestWidth + SHADOW_WIDTH - 2,
          )

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

      {/* BAKCREST PILLOW 1 */}
      {Array.from({ length: backPillowNumber }, (_, index) => (
        <Line
          key={index}
          x={
            backPillowCenterMargin +
            (backPillowSize + shapeSpreadOfBigPillows) * index -
            index * 5
          }
          y={shapeBackrestWidth + backPillowSize / 4}
          rotation={-6}
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
          stroke={PILLOW_STROKE_COLOR}
          strokeWidth={PILLOW_STROKE_WIDTH}
          fill={PILLOW_FILL_COLOR}
        />
      ))}

      {Array.from({ length: smallPillowNumber }, (_, index) => (
        <Line
          key={index * 100}
          x={
            smallPillowCenterMargin +
            (pillowSize + shapeSpreadOfSmallPillows) * index -
            index * 5
          }
          y={shapeBackrestWidth + backPillowSize / 3 + pillowSize / 5 + 1}
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
          stroke={PILLOW_STROKE_COLOR}
          strokeWidth={PILLOW_STROKE_WIDTH}
          fill={PILLOW_FILL_COLOR}
        />
      ))}
    </Group>
  )
}

export default SOFA2MANYPILLOW
