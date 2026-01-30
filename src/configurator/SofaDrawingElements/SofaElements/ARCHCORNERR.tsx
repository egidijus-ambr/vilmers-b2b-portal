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
  ANGLE_RADIUS,
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

const ARCHCORNERR = ({
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
  ...props
}) => {
  //----

  const shapeWidth =
    width === 0 || width === null || width === '' || width === undefined
      ? 100
      : width
  const shapeHeight =
    height === 0 || height === null || height === '' || height === undefined
      ? 100
      : height

  const shapeArmrestWidth = armrestWidth ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

  //--- ANGLE
  const connectionAngle = angle ?? 90
  const angleT = connectionAngle * (Math.PI / 180) // Convert degrees to radians

  //--- Calculating coordinates for the right end X an Y
  let H = shapeWidth / Math.cos(angleT)
  let Hs = H - shapeWidth
  let Xintersection = Math.cos(angleT) * Hs
  let Yintersection = Math.sin(angleT) * Hs

  let HsBackrest = H - shapeWidth + shapeBackrestWidth
  let XBintersection = Math.cos(angleT) * HsBackrest
  let YBintersection = Math.sin(angleT) * HsBackrest

  let shapeHeightTrigonometry = Math.tan(angleT) * shapeWidth

  //=====

  let xOffset = x
  let yOffset = y

  let groupWidth = shapeWidth
  let groupHeight = shapeHeight

  let shapeOffsetFix = 0

  const connectors = [
    {
      type: 'left',
      x: 0,
      y: shapeHeight,
      rotation: -90,
    },
    // {
    //   type: 'right',
    //   x: shapeWidth,
    //   y: 0,
    //   rotation: 0,
    // },
    {
      type: 'right',
      x: Xintersection,
      y: shapeHeight - shapeHeightTrigonometry + Yintersection,
      rotation: 0 - (90 - connectionAngle),
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
      type="ARCHCORNERR"
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

      {connectionAngle === 90 && (
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
            ctx.moveTo(shapeWidth, 0)
            ctx.quadraticCurveTo(0, 0, 0, shapeHeight)

            ctx.lineTo(shapeBackrestWidth, shapeHeight)
            ctx.quadraticCurveTo(
              shapeBackrestWidth,
              shapeBackrestWidth,
              shapeWidth,
              0 + shapeBackrestWidth,
            )
            ctx.lineTo(shapeWidth, 0)

            ctx.fillStrokeShape(shape)

            ctx.moveTo(shapeWidth, shapeBackrestWidth)
            ctx.lineTo(shapeWidth, shapeHeight * (1 - ANGLE_RADIUS))

            ctx.quadraticCurveTo(
              shapeWidth * (1 - ANGLE_RADIUS),
              shapeHeight * (1 - ANGLE_RADIUS),
              shapeWidth * (1 - ANGLE_RADIUS),
              shapeHeight,
            )
            ctx.lineTo(0, shapeHeight)
            ctx.quadraticCurveTo(0, 0, shapeWidth, 0)
            // ctx.quadraticCurveTo(0, 0, Xintersection, Yintersection)

            ctx.fillStrokeShape(shape)
          }}
          stroke="black"
          strokeWidth={1}
          name={'sofa_shape'}
        />
      )}

      {connectionAngle != 90 && (
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
            ctx.moveTo(0, shapeHeight)

            ctx.quadraticCurveTo(
              0,
              shapeHeight -
                shapeHeightTrigonometry +
                Yintersection +
                shapeBackrestWidth / 2,
              Xintersection,
              shapeHeight - shapeHeightTrigonometry + Yintersection,
            )

            const widthOfSmallTriangle = shapeWidth * ANGLE_RADIUS
            const HypothenousOfSmallTriangle =
              widthOfSmallTriangle / Math.cos(1 - angleT)
            const YofSmallTriangle =
              Math.sin(angleT) * HypothenousOfSmallTriangle
            const XofSmallTriangle =
              Math.cos(angleT) * HypothenousOfSmallTriangle

            ctx.lineTo(
              shapeWidth - XofSmallTriangle,
              shapeHeight - YofSmallTriangle,
            )

            ctx.quadraticCurveTo(
              shapeWidth - widthOfSmallTriangle,
              shapeHeight - YofSmallTriangle,

              shapeWidth - widthOfSmallTriangle,
              shapeHeight,
            )
            ctx.lineTo(0, shapeHeight)
            ctx.fillStrokeShape(shape)

            ctx.moveTo(0 + shapeBackrestWidth, shapeHeight)
            ctx.quadraticCurveTo(
              0 + shapeBackrestWidth,
              shapeHeight -
                shapeHeightTrigonometry +
                YBintersection +
                shapeBackrestWidth / 2,
              XBintersection,
              shapeHeight - shapeHeightTrigonometry + YBintersection,
            )

            ctx.fillStrokeShape(shape)
          }}
          stroke="black"
          strokeWidth={1}
          name={'sofa_shape'}
        />
      )}

      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo key={`gizmo-${index}`} settings={conn} />
        ),
      )}
    </Group>
  )
}

export default ARCHCORNERR

// === ORIGINAL WITHOUT TRIGONOMETRY =====
// const ARCHCORNERR = ({
//   id,
//   width,
//   height,
//   x,
//   y,
//   draggable = false,
//   verticalMetric = false,
//   horizontalMetric = false,
//   layer = null,
//   onDelete = null,
//   showButtons = false,
//   scale = 0,
//   stageWidth,
//   stageHeight,
//   currentRotation = 0,
//   originalSofaForm = null,
//    armrestWidth = 10,
//   backrestWidth = 20,
//   mattressWidth = null,
//   mattressLength = null,
//   rotation = 0,
//   ...props
// }) => {
//   //----

//   const shapeWidth = width
//   const shapeHeight = height

//   const shapeArmrestWidth = armrestWidth ?? ARMS_REST_WIDTH
//   const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

//   let xOffset = x
//   let yOffset = y

//   let groupWidth = shapeWidth
//   let groupHeight = shapeHeight

//   let shapeOffsetFix = 0

//   const connectors = [
//     {
//       type: 'left',
//       x: 0,
//       y: 0,
//       rotation: 0,
//     },
//     {
//       type: 'right',
//       x: shapeWidth,
//       y: shapeHeight,
//       rotation: 90,
//     },
//   ]
//   // A function that limits exit of View zone
//   const dragBound = (e) => {
//     // ---
//     // console.log('incoking drag bound e :>> ', e)
//     let pos = e
//     if (pos) {
//       // Left side
//       if (pos.x < 0 + METRIC_SIZE * scale) {
//         pos.x = 0 + METRIC_SIZE * scale
//       }
//       // Right side
//       if (pos.x + groupWidth * scale > stageWidth) {
//         pos.x = stageWidth - groupWidth * scale
//       }
//       // Top side
//       if (pos.y < 0 + METRIC_SIZE * scale) {
//         pos.y = 0 + METRIC_SIZE * scale
//       }
//       // Bottom side
//       if (pos.y + groupHeight * scale > stageHeight) {
//         pos.y = stageHeight - groupHeight * scale
//       }
//     }
//     return pos
//   }

//   return (
//     <Group
//       id={id}
//       draggable={draggable}
//       name={'sofa_shape_group'}
//       width={groupWidth}
//       height={groupHeight}
//       type="ARCHCORNERR"
//       x={xOffset}
//       y={yOffset}
//       originalWidth={width}
//       originalHeight={height}
//       dragBoundFunc={(e) => dragBound(e)}
//       originalSofaForm={originalSofaForm}
//       connectors={props.enabled_connectors == false ? [] : connectors}
//       rotation={rotation}
//     >
//       {verticalMetric && (
//         <VerticalMetric x={0 - 50} y={0} height={groupHeight} width={null} />
//       )}
//       {horizontalMetric && (
//         <HorizontalMetric x={0} y={0 - 50} height={null} width={groupWidth} />
//       )}
//       <Rect // This rect is needed to properly get getClientRect dimensions.
//         x={0}
//         y={0}
//         width={shapeWidth}
//         height={shapeHeight}
//       />
//       <Shape
//         // ---
//         offsetX={shapeWidth / 2}
//         offsetY={shapeHeight / 2}
//         // We need to set x, y, origin in center
//         x={shapeWidth / 2 + shapeOffsetFix}
//         y={shapeHeight / 2 - shapeOffsetFix}
//         //----
//         fill={MAIN_SHAPE_COLOR}
//         sceneFunc={(ctx, shape) => {
//           ctx.beginPath()
//           ctx.moveTo(0, 0)
//           ctx.quadraticCurveTo(shapeWidth, 0, shapeWidth, shapeHeight)
//           ctx.lineTo(shapeWidth - shapeBackrestWidth, shapeHeight)
//           ctx.quadraticCurveTo(
//             shapeWidth - shapeBackrestWidth,
//             shapeBackrestWidth,
//             0,
//             0 + shapeBackrestWidth,
//           )
//           ctx.lineTo(0, 0)

//           ctx.fillStrokeShape(shape)

//           ctx.moveTo(0, shapeBackrestWidth)
//           ctx.lineTo(0, shapeHeight * (1 - ANGLE_RADIUS))
//           ctx.quadraticCurveTo(
//             shapeWidth - shapeWidth * (1 - ANGLE_RADIUS),
//             shapeHeight * (1 - ANGLE_RADIUS),
//             shapeWidth - shapeWidth * (1 - ANGLE_RADIUS),
//             shapeHeight,
//           )
//           ctx.lineTo(shapeWidth, shapeHeight)
//           ctx.quadraticCurveTo(shapeWidth, 0, 0, 0)

//           ctx.fillStrokeShape(shape)
//         }}
//         stroke="black"
//         strokeWidth={1}
//         name={'sofa_shape'}
//       />
//       {(props.enabled_connectors == false ? [] : connectors)?.map((conn, index) => (
//         <Gizmo key={`gizmo-${index}`} settings={conn} />
//       ))}
//     </Group>
//   )
// }
