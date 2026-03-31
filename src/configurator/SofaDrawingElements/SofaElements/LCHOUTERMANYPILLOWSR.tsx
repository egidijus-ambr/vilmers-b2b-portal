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
  LCH_ARMSREST_LENGTH_PERCETAGE,
  MAIN_SHAPE_COLOR,
  MAIN_SHAPE_SHADOW_COLOR,
  METRIC_SIZE,
  PILLOW_FILL_COLOR,
  PILLOW_STROKE_COLOR,
  PILLOW_STROKE_WIDTH,
  SHADOW_WIDTH,
  STANDART_PILLOW_SIZE,
} from './constants'
import { HorizontalMetric, VerticalMetric } from './MetricLines'
import Konva from 'konva'

import E from './E'
import Gizmo from '../Gizmo'
import { DoubleArrowComponent } from './DoubleArrowComponent'
import { ArrowComponent } from './ArrowComponent'

export const getDefaultSettings = () => {
  return {
    dimensions: {
      width: 120,
      length: 180,
      armrestPosition: 'L',
    },
    changeableProperties: {
      width: true,
      height: true,
      length: true,
      backrest_width: true,
      armrest_width: true,

      number_of_big_pillows: true,
      spread_of_big_pillows: true,
      size_of_big_pillow: true,

      number_of_small_pillows: true,
      spread_of_small_pillows: true,
      size_of_pillow: true,
      backrest_type: true,
    },
  }
}

export const getDimensions = ({ shapeWidth, shapeHeight, angle }) => {
  return {
    armrestPosition: 'L',
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

const LCHOUTERMANYPILLOWSR = ({
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
  cornerRadius = 0,
  ...props
}) => {
  //----

  const armOver = armrestWidthOverride ?? armrestWidth

  const shapeWidth = width + armOver - armrestWidth
  const shapeHeight = height

  const shapeArmrestWidth = armOver ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

  let pillowSize = sizeOfPillow ?? STANDART_PILLOW_SIZE
  let backPillowSize = sizeOfBigPillow ?? BACKREST_PILLOW_SIZE

  //=== Pillows
  let backPillowNumber = numberOfBigPillows ?? 0
  let smallPillowNumber =
    numberOfSmallPillows != null ? numberOfSmallPillows : 0

  let shapeSpreadOfBigPillows = spreadOfBigPillows ?? 0 // Adds distance between pillows

  // let shapeSpreadOfBigPillows = -10

  let shapeSpreadOfSmallPillows = spreadOfSmallPillows ?? 0 // Adds distance between pillows

  let backPillowTotalWidth =
    (backPillowNumber * backPillowSize +
      (backPillowNumber - 1) * shapeSpreadOfBigPillows) /
    1.1 // We add the 1.2 due to rotation
  let backPillowCenterMargin =
    (shapeWidth - shapeArmrestWidth - backPillowTotalWidth) / 2
  backPillowCenterMargin =
    backPillowCenterMargin < 0 ? 0 : backPillowCenterMargin

  let smallPillowTotalWidth =
    smallPillowNumber * pillowSize +
    (smallPillowNumber - 1) * shapeSpreadOfSmallPillows

  let smallPillowCenterMargin =
    (shapeWidth - shapeArmrestWidth - smallPillowTotalWidth) / 2
  smallPillowCenterMargin =
    smallPillowCenterMargin < 0 ? 0 : smallPillowCenterMargin
  //------

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
      type="LCHOUTERMANYPILLOWSR"
      x={xOffset}
      y={yOffset}
      originalWidth={width}
      originalHeight={height}
      dragBoundFunc={(e) => dragBound(e)}
      originalSofaForm={originalSofaForm}
      connectors={props.enabled_connectors == false ? [] : connectors}
      rotation={rotation}
      armrestPosition="R"
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

          const radius = Math.min(
            cornerRadius,
            (shapeWidth - shapeArmrestWidth) / 2,
            shapeHeight / 2,
          )

          if (radius > 0) {
            // Main body with rounded bottom corners only
            const mainX = 0
            const mainY = 0
            const mainWidth = shapeWidth - shapeArmrestWidth
            const mainHeight = shapeHeight

            ctx.moveTo(mainX, mainY)
            ctx.lineTo(mainX + mainWidth, mainY)
            ctx.lineTo(mainX + mainWidth, mainY + mainHeight - radius)
            ctx.arcTo(
              mainX + mainWidth,
              mainY + mainHeight,
              mainX + mainWidth - radius,
              mainY + mainHeight,
              radius,
            )
            ctx.lineTo(mainX + radius, mainY + mainHeight)
            ctx.arcTo(
              mainX,
              mainY + mainHeight,
              mainX,
              mainY + mainHeight - radius,
              radius,
            )
            ctx.lineTo(mainX, mainY)
            ctx.closePath()
          } else {
            // Fallback to regular rectangle
            ctx.rect(0, 0, shapeWidth - shapeArmrestWidth, shapeHeight)
          }

          ctx.rect(
            shapeWidth - shapeArmrestWidth,
            0,
            shapeArmrestWidth,
            shapeBackrestWidth + shapeHeight * LCH_ARMSREST_LENGTH_PERCETAGE,
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
            shapeHeight * LCH_ARMSREST_LENGTH_PERCETAGE +
              SHADOW_WIDTH +
              shapeBackrestWidth,
          )

          ctx.fillStrokeShape(shape)
        }}
        stroke={MAIN_SHAPE_SHADOW_COLOR}
        strokeWidth={SHADOW_WIDTH}
      />

      {/* Double arrows for MECHANIC backrest type */}
      {(props.backrestType === 'MECHANIC' ||
        props.backrestType === 'ELECTRIC') &&
        Array.from({ length: props.backrestSections ?? 1 }, (_, index) => {
          if (props.backrestType === 'MECHANIC') {
            return (
              <DoubleArrowComponent
                key={`backrest-arrow-${index}`}
                x={
                  shapeArmrestWidth +
                  ((shapeWidth - shapeArmrestWidth) /
                    (props.backrestSections ?? 1)) *
                    (index + 0.5)
                }
                y={shapeBackrestWidth / 2}
              />
            )
          } else if (props.backrestType === 'ELECTRIC') {
            return (
              <ArrowComponent
                key={`backrest-arrow-${index}`}
                x={
                  shapeArmrestWidth +
                  ((shapeWidth - shapeArmrestWidth) /
                    (props.backrestSections ?? 1)) *
                    (index + 0.5)
                }
                y={shapeBackrestWidth / 2}
              />
            )
          }
          return null
        })}

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
      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => <Gizmo key={`gizmo-${index}`} settings={conn} />,
      )}
    </Group>
  )
}

export default LCHOUTERMANYPILLOWSR
