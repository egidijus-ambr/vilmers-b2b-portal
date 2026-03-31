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
  STANDART_PILLOW_SIZE,
} from './constants'
import { HorizontalMetric, VerticalMetric } from './MetricLines'
import Konva from 'konva'

import Gizmo from '../Gizmo'
import PillowComponent from './PillowComponent'

export const getDefaultSettings = () => {
  return {
    dimensions: {
      width: 100,
      length: 100,
      armrestPosition: '',
      corner_radius: 50,
      angle: 90,

      number_of_big_pillows: 0,
      number_of_small_pillows: 0,
      spread_of_small_pillows: 60,
      spread_of_big_pillows: 60,
      size_of_big_pillow: STANDART_PILLOW_SIZE,
      size_of_pillow: STANDART_PILLOW_SIZE,
      seat_sections: 1,
      backrest_sections: 1,
    },
    changeableProperties: {
      //width: true,
      height: true,
      length: true,
      seat_height: false,
      corner_radius: true,
      angle: true,
      //corner_radius: true,
      // seat_depth: false,
      // armrest_width: false,
      backrest_width: true,
      seat_sections: true,
      backrest_sections: true,
      number_of_big_pillows: true,
      //number_of_small_pillows: true,
      //spread_of_small_pillows: true,
      //spread_of_big_pillows: true,
      size_of_big_pillow: true,
      //size_of_pillow: true,
      // corner_part_length: false,
      // mattress_width: false,
      // mattress_length: false,
      // fabric_usage: false,
    },
  }
}

export const getDimensions = ({
  shapeWidth,
  shapeHeight,
  angle,
  cornerRadius,
}) => {
  return {
    armrestPosition: null,
    connectors: [
      {
        type: 'left',
        x: 0,
        y: 0,
        rotation: 0,
      },
      {
        type: 'right',
        x: (shapeHeight + cornerRadius) * Math.sin(angle * (Math.PI / 180)),
        y:
          shapeHeight +
          cornerRadius -
          (shapeHeight + cornerRadius) * Math.cos(angle * (Math.PI / 180)),
        rotation: angle,
      },
    ],
  }
}

const ARCHCORNERL = ({
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
  cornerRadius = 20,
  seatSections = 0,
  backrestSections = 0,
  ...props
}) => {
  //----

  // Extract pillow properties from props
  const numberOfBigPillows = props.numberOfBigPillows || 0
  const sizeOfBigPillow = props.sizeOfBigPillow || STANDART_PILLOW_SIZE

  const shapeHeight =
    height === 0 || height === null || height === '' || height === undefined
      ? 100
      : height

  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH

  //--- ANGLE
  const connectionAngle = angle ?? 90
  const angleT = connectionAngle * (Math.PI / 180) // Convert degrees to radians

  const innerCornerRadius = Math.min(Math.max(cornerRadius, 0), shapeHeight)

  const outerRadius = shapeHeight + innerCornerRadius
  const innerRadius = Math.max(innerCornerRadius, 0)

  // Ensure backrest radius is never negative
  const backrestRadius = Math.max(outerRadius - shapeBackrestWidth, 0)

  // Calculate the horizontal width based on the arc geometry and angle
  // For an arch corner, the horizontal width is the horizontal projection of the arc
  const shapeWidth = outerRadius * Math.sin(angleT)

  //--- Calculating coordinates for the right end X an Y
  let H = shapeHeight / Math.cos(angleT)
  let Hs = H - shapeHeight
  let Xintersection = Math.cos(angleT) * Hs
  let Yintersection = Math.sin(angleT) * Hs

  let HsBackrest = H - shapeHeight + shapeBackrestWidth
  let XBintersection = Math.cos(angleT) * HsBackrest
  let YBintersection = Math.sin(angleT) * HsBackrest

  let shapeHeightTrigonometry = Math.tan(angleT) * shapeHeight

  //=====

  let xOffset = x
  let yOffset = y

  // Update group dimensions to accommodate the arc
  let groupWidth = outerRadius
  let groupHeight = outerRadius

  let shapeOffsetFix = 0

  const dimensions = getDimensions({
    shapeWidth,
    shapeHeight,
    angle: angle,
    cornerRadius: innerCornerRadius,
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
      type="ARCHCORNERL"
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
        <VerticalMetric x={0 - 50} y={0} height={shapeHeight} width={null} />
      )}
      {horizontalMetric && (
        <HorizontalMetric x={0} y={0 - 50} height={null} width={shapeWidth} />
      )}
      <Rect // This rect is needed to properly get getClientRect dimensions.
        x={0}
        y={0}
        width={shapeWidth}
        height={shapeHeight}
      />

      <Shape
        // ---
        offsetX={outerRadius}
        offsetY={-outerRadius}
        // We need to set x, y, origin in center
        x={0}
        y={0}
        //----
        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath()

          // Calculate center point for the arc (adjusted so top-left corner is at 0,0)
          const centerX = outerRadius
          const centerY = 0

          // Start angle (-90 degrees = top side, rotated from right side)
          const startAngle = -Math.PI / 2
          // End angle based on the connectionAngle parameter (also rotated by -90 degrees)
          const endAngle = angleT - Math.PI / 2

          // Draw outer arc
          ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle, false)

          // Draw line to inner arc start
          const innerEndX = centerX + innerRadius * Math.cos(endAngle)
          const innerEndY = centerY + innerRadius * Math.sin(endAngle)
          ctx.lineTo(innerEndX, innerEndY)

          // Draw inner arc (reverse direction)
          ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true)

          // Close the path
          ctx.closePath()

          ctx.fillStrokeShape(shape)
        }}
        stroke="black"
        strokeWidth={1}
        name={'sofa_shape'}
      />

      {/* Seat section divider lines */}
      {seatSections > 1 && (
        <Group offsetX={outerRadius} offsetY={-outerRadius} x={0} y={0}>
          {Array.from({ length: seatSections - 1 }, (_, i) => {
            const sectionAngle = angleT / seatSections
            const dividerAngle = -Math.PI / 2 + (i + 1) * sectionAngle

            // Calculate start and end points for the divider line
            const startX = outerRadius + innerRadius * Math.cos(dividerAngle)
            const startY = 0 + innerRadius * Math.sin(dividerAngle)
            const endX = outerRadius + backrestRadius * Math.cos(dividerAngle)
            const endY = 0 + backrestRadius * Math.sin(dividerAngle)

            return (
              <Line
                key={`divider-${i}`}
                points={[startX, startY, endX, endY]}
                stroke="black"
                strokeWidth={1}
                name={`seat_divider_${i}`}
              />
            )
          })}
        </Group>
      )}

      {/* Backrest arc line */}
      <Shape
        offsetX={outerRadius}
        offsetY={-outerRadius}
        x={0}
        y={0}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath()

          // Calculate center point for the arc
          const centerX = outerRadius
          const centerY = 0

          // Start and end angles
          const startAngle = -Math.PI / 2
          const endAngle = angleT - Math.PI / 2

          // Only draw backrest arc if radius is positive
          if (backrestRadius > 0) {
            // Draw backrest arc line
            ctx.arc(
              centerX,
              centerY,
              backrestRadius,
              startAngle,
              endAngle,
              false
            )
          }

          ctx.fillStrokeShape(shape)
        }}
        stroke="black"
        strokeWidth={1}
        name={'backrest_line'}
      />

      {/* Backrest section divider lines */}
      {backrestSections > 1 && (
        <Group offsetX={outerRadius} offsetY={-outerRadius} x={0} y={0}>
          {Array.from({ length: backrestSections - 1 }, (_, i) => {
            const sectionAngle = angleT / backrestSections
            const dividerAngle = -Math.PI / 2 + (i + 1) * sectionAngle

            // Calculate start and end points for the backrest divider line
            const startX = outerRadius + backrestRadius * Math.cos(dividerAngle)
            const startY = 0 + backrestRadius * Math.sin(dividerAngle)
            const endX = outerRadius + outerRadius * Math.cos(dividerAngle)
            const endY = 0 + outerRadius * Math.sin(dividerAngle)

            return (
              <Line
                key={`backrest-divider-${i}`}
                points={[startX, startY, endX, endY]}
                stroke="black"
                strokeWidth={1}
                name={`backrest_divider_${i}`}
              />
            )
          })}
        </Group>
      )}

      {/* Pillows along the backrest */}
      {numberOfBigPillows > 0 && (
        <Group offsetX={outerRadius} offsetY={-outerRadius} x={0} y={0}>
          {Array.from({ length: numberOfBigPillows }, (_, i) => {
            // Calculate the angle for each pillow along the backrest
            // Divide arc into numberOfBigPillows sections and place pillow in center of each section
            const sectionAngle = angleT / numberOfBigPillows
            const pillowAngle = sectionAngle * (i + 0.5) // Center of section
            const pillowAngleFromTop = -Math.PI / 2 + pillowAngle

            // Position pillows slightly inward from the backrest line
            const pillowRadius = Math.max(
              backrestRadius - sizeOfBigPillow / 4,
              0
            )
            const pillowX =
              outerRadius + pillowRadius * Math.cos(pillowAngleFromTop)
            const pillowY = 0 + pillowRadius * Math.sin(pillowAngleFromTop)

            // Calculate rotation to align pillow with the arc
            const pillowRotation = (pillowAngle * 180) / Math.PI

            return (
              <PillowComponent
                key={`pillow-${i}`}
                x={pillowX}
                y={pillowY}
                rotation={pillowRotation}
                size={sizeOfBigPillow}
                fill="#f0f0f0"
                stroke="black"
                strokeWidth={1}
              />
            )
          })}
        </Group>
      )}

      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo key={`gizmo-${index}`} settings={conn} />
        )
      )}
    </Group>
  )
}

export default ARCHCORNERL
