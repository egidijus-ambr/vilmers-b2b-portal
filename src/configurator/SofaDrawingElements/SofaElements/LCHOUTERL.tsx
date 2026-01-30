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
      armrest_width: true,
      backrest_width: true,
      corner_radius: true,
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

// "/svg_icons/arrow-rotate-right-solid.svg"
// "/svg_icons/trash-solid.svg"

const LCHOUTERL = ({
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
  cornerRadius = 0,
  ...props
}) => {
  //----

  const armOver = armrestWidthOverride ?? armrestWidth

  const shapeWidth = width + armOver - armrestWidth
  const shapeHeight = height

  const shapeArmrestWidth = armOver ?? ARMS_REST_WIDTH
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
      type="LCHOUTERL"
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

          const radius = Math.min(
            cornerRadius,
            (shapeWidth - armrestWidth) / 2,
            shapeHeight / 2
          )

          if (radius > 0) {
            // Main body with bottom left and bottom right corners rounded
            const mainX = shapeArmrestWidth
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

            // Armrest with no rounded corners
            const armX = 0
            const armY = 0
            const armWidth = shapeArmrestWidth
            const armHeight =
              shapeBackrestWidth + shapeHeight * LCH_ARMSREST_LENGTH_PERCETAGE

            ctx.moveTo(armX, armY)
            ctx.lineTo(armX + armWidth, armY)
            ctx.lineTo(armX + armWidth, armY + armHeight)
            ctx.lineTo(armX, armY + armHeight)
            ctx.lineTo(armX, armY)
            ctx.closePath()

            // Backrest with no rounded corners
            const backX = shapeArmrestWidth
            const backY = 0
            const backWidth = shapeWidth - shapeArmrestWidth
            const backHeight = shapeBackrestWidth

            ctx.rect(backX, backY, backWidth, backHeight)
          } else {
            // Fallback to regular rectangles
            ctx.rect(
              shapeArmrestWidth,
              0,
              shapeWidth - shapeArmrestWidth,
              shapeHeight
            )
            ctx.rect(
              0,
              0,
              shapeArmrestWidth,
              shapeBackrestWidth + shapeHeight * LCH_ARMSREST_LENGTH_PERCETAGE
            )
            ctx.rect(
              shapeArmrestWidth,
              0,
              shapeWidth - shapeArmrestWidth,
              shapeBackrestWidth
            )
          }

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
            shapeArmrestWidth + SHADOW_WIDTH - 2,
            shapeBackrestWidth + SHADOW_WIDTH - 2
          )
          ctx.lineTo(shapeWidth - 2, shapeBackrestWidth + SHADOW_WIDTH - 2)
          ctx.moveTo(
            shapeArmrestWidth + SHADOW_WIDTH - 2,
            shapeBackrestWidth + SHADOW_WIDTH - 2
          )
          ctx.lineTo(
            shapeArmrestWidth + SHADOW_WIDTH - 2,
            shapeBackrestWidth + shapeHeight * LCH_ARMSREST_LENGTH_PERCETAGE + 2
          )

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

export default LCHOUTERL
