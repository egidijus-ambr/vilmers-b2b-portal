// DEPRECATED FILE. USE ANGLECORNERFLAT INSTEAD.

import React, { useCallback, useEffect, useState } from 'react'
import { Shape, Group, Rect, Circle, Image, Line } from 'react-konva'
import { haveIntersection } from '../utils'
import {
  ANGLE_CORNER_ANGLE,
  ARMS_REST_WIDTH,
  BACKREST_PILLOW_SIZE,
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

export const getDefaultSettings = () => {
  return {
    dimensions: {
      width: 120,
      length: 120,
      armrestPosition: '',
      angle: 90,
      number_of_big_pillows: 1,
    },
    changeableProperties: {
      width: true,
      height: true,
      length: true,
      backrest_width: true,
      angle: true,
      number_of_big_pillows: true,
      spread_of_big_pillows: true,
      size_of_big_pillow: true,

      number_of_small_pillows: true,
      spread_of_small_pillows: true,
      size_of_pillow: true,
    },
  }
}

export const getDimensions = ({ shapeWidth, shapeHeight, angle }) => {
  const connectionAngle = angle ?? ANGLE_CORNER_ANGLE

  const angleT = (connectionAngle * Math.PI) / 180 // Convert degrees to radians

  const cosAngle = Math.cos(angleT)
  const sinAngle = Math.sin(angleT)

  const singleShapeWidth = (shapeWidth - 0) / (1 + Math.cos(angleT))
  // Apply rotation
  const rotatedWidth = singleShapeWidth * cosAngle
  const rotatedHeight = singleShapeWidth * sinAngle

  return {
    armrestPosition: '',
    connectors: [
      {
        type: 'left',
        x: 0,
        y: 0,
        // rotation: connectionAngle,
      },
      {
        type: 'right',
        x: shapeWidth,
        y: rotatedHeight,
        rotation: connectionAngle,
      },
    ],
  }
}

const ANGLECORNERFLATMANYPILLOW = ({
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

  const shapeWidth = width + armOver - armrestWidth
  const shapeHeight = height

  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH
  const connectionAngle = angle ?? ANGLE_CORNER_ANGLE

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
  const singleShapeWidth = shapeWidth / (1 + Math.cos(angleT))
  // Apply rotation
  const rotatedWidth = singleShapeWidth * cosAngle
  const rotatedHeight = singleShapeWidth * sinAngle

  const dimensions = getDimensions({
    shapeWidth,
    shapeHeight,
    angle: angle,
  })
  const connectors = dimensions.connectors

  //==== CALCULATING FOR THE EXTENDED SHAPE
  let X = singleShapeWidth - shapeHeight * Math.tan(angleLine)
  // angleT --- The angle
  let Y = Math.sin(angleT) * X
  let SX = Math.cos(angleT) * X
  let AX = X + SX
  let FullY = shapeHeight + Y

  // console.log('AX :>> ', AX)
  // console.log('FullY :>> ', FullY)

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
  let backPillowCenterMargin = (singleShapeWidth - backPillowTotalWidth) / 2
  backPillowCenterMargin =
    backPillowCenterMargin < 0 ? 0 : backPillowCenterMargin

  let smallPillowTotalWidth =
    smallPillowNumber * pillowSize +
    (smallPillowNumber - 1) * shapeSpreadOfSmallPillows

  let smallPillowCenterMargin = (singleShapeWidth - smallPillowTotalWidth) / 2
  smallPillowCenterMargin =
    smallPillowCenterMargin < 0 ? 0 : smallPillowCenterMargin
  //----------------------

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
      type="ANGLECORNERFLATMANYPILLOW"
      x={xOffset}
      y={yOffset}
      originalWidth={width}
      originalHeight={height}
      dragBoundFunc={e => dragBound(e)}
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
        width={singleShapeWidth + rotatedWidth}
        height={rotatedHeight + shapeHeight * cosAngle}
      />

      <Shape
        x={singleShapeWidth}
        y={0}
        //----

        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) =>
          drawShapeLeft(ctx, shape, {
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
        x={0}
        y={0}
        //----
        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) =>
          drawShapeRight(ctx, shape, {
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

      <Line
        x={0}
        y={0}
        points={[0, shapeHeight, AX, FullY, X, shapeHeight, 0, shapeHeight]}
        stroke={MAIN_SHAPE_COLOR}
        strokeWidth={3}
        closed
        fill={MAIN_SHAPE_COLOR}
      />
      <Line
        x={0}
        y={0}
        points={[0, shapeHeight, AX, FullY]}
        // stroke={MAIN_SHAPE_COLOR}
        stroke={'black'}
        strokeWidth={1}
        // closed
        // fill={MAIN_SHAPE_COLOR}
      />

      {/* Line covering the middle line with shape color */}
      <Line
        x={0}
        y={0}
        points={[
          singleShapeWidth - shapeBackrestWidth * Math.tan(angleLine),
          shapeBackrestWidth + 3,
          singleShapeWidth - shapeHeight * Math.tan(angleLine),
          shapeHeight,
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
          stroke="black"
          strokeWidth={1}
          fill={'#ddd'}
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
          stroke="black"
          strokeWidth={1}
          fill={'#ddd'}
        />
      ))}

      <Group id={id + 123123} x={singleShapeWidth} rotation={connectionAngle}>
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
            stroke="black"
            strokeWidth={1}
            fill={'#ddd'}
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
            stroke="black"
            strokeWidth={1}
            fill={'#ddd'}
          />
        ))}
      </Group>
    </Group>
  )
}

export default ANGLECORNERFLATMANYPILLOW
