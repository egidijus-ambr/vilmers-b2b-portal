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
  BED_FORM_COLOR,
  MAIN_SHAPE_COLOR,
  MAIN_SHAPE_SHADOW_COLOR,
  MATTRESS_LENGTH,
  MATTRESS_WIDTH,
  METRIC_SIZE,
  SHADOW_WIDTH,
  SLEEP_PART_LENGTH_PERCETAGE,
} from './constants'
import { HorizontalMetric, VerticalMetric } from './MetricLines'
import Konva from 'konva'
// import RotateRightIcon from '@mui/icons-material/RotateRight'
import useImage from 'use-image'
import Gizmo from '../Gizmo'

export const getDefaultSettings = () => {
  return {
    dimensions: {
      width: 200,
      length: 100,
      armrestPosition: 'L',
    },
    changeableProperties: {
      width: true,
      height: true,
      length: true,
      armrest_width: true,
      backrest_width: true,

      mattress_width: true,
      mattress_length: true,

      // number_of_big_pillows: true,
      // number_of_small_pillows: true,
      // spread_of_small_pillows: true,
      // spread_of_big_pillows: true,
      // size_of_big_pillow: true,
      // size_of_pillow: true,

      // extendable_part_length: true,
      // seat_sections: true,
      // backrest_sections: true,
      // extension_type: true,
      // backrest_type: true,
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

const SLEEPL = ({
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
  scale = 1,
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
  const [hideSofa, setHideSofa] = useState(false)
  // ---
  const [anglesUpIcon] = useImage('/svg_icons/angles-up.svg')
  const [anglesDownIcon] = useImage('/svg_icons/angles-down.svg')
  //---
  const shapeWidth = width
  const shapeHeight = height

  // If no data, fallsback to standarts
  const shapeArmrestWidth = armrestWidth ?? ARMS_REST_WIDTH
  const shapeBackrestWidth = backrestWidth ?? BACK_REST_WIDTH
  const shapeMattressWidth = mattressWidth ?? MATTRESS_WIDTH
  const shapeMattressLength = mattressLength ?? MATTRESS_LENGTH

  let xOffset = x
  let yOffset = y

  let groupWidth = shapeWidth
  let groupHeight = shapeHeight

  let shapeOffsetFix = 0
  const connectors = [
    {
      type: 'right',
      x: shapeWidth,
      y: 0,
      rotation: 0,
    },
  ]
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

  const onSofaHide = e => {
    console.log('Trying to hide sofa mechanizm SLEEPL')
    setHideSofa(!hideSofa)
  }

  let spaceBetween = (shapeWidth - shapeArmrestWidth - shapeMattressWidth) / 2
  spaceBetween = spaceBetween < 0 ? 0 : spaceBetween
  const shapeStartingX = shapeArmrestWidth + spaceBetween

  const finalMatressWidht = Math.min(
    shapeMattressWidth,
    shapeWidth - shapeArmrestWidth
  )
  return (
    <Group
      id={id}
      draggable={draggable}
      name={'sofa_shape_group'}
      width={groupWidth}
      height={groupHeight}
      type="SLEEPL"
      x={xOffset}
      y={yOffset}
      originalWidth={width}
      originalHeight={height}
      dragBoundFunc={e => dragBound(e)}
      originalSofaForm={originalSofaForm}
      connectors={props.enabled_connectors == false ? [] : connectors}
      rotation={rotation}
      armrestPosition="L"
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

          ctx.moveTo((shapeWidth + shapeArmrestWidth) / 2, 0)
          ctx.lineTo((shapeWidth + shapeArmrestWidth) / 2, shapeBackrestWidth)

          // -- Original line
          ctx.lineTo((shapeWidth + shapeArmrestWidth) / 2, shapeHeight)
          ctx.rect(
            shapeArmrestWidth,
            0,
            shapeWidth - shapeArmrestWidth,
            shapeHeight
          )
          ctx.rect(0, 0, shapeArmrestWidth, shapeHeight)
          ctx.rect(
            shapeArmrestWidth,
            0,
            shapeWidth - shapeArmrestWidth,
            shapeBackrestWidth
          )

          ctx.fillStrokeShape(shape)

          //   ctx.rect(
          //     shapeArmrestWidth,
          //     shapeBackrestWidth + SHADOW_WIDTH + 1,
          //     shapeWidth - shapeArmrestWidth - 2,
          //     shapeHeight - shapeBackrestWidth - SHADOW_WIDTH - 2,
          //   )

          //   ctx.fillStrokeShape(shape)
        }}
        stroke="black"
        strokeWidth={1}
        name={'sofa_shape'}
      />

      <Shape
        // We need to set x, y, origin in center
        x={0}
        y={0}
        //----
        fill={MAIN_SHAPE_COLOR}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath()
          // Draw shadow
          ctx.moveTo(
            shapeArmrestWidth + SHADOW_WIDTH - 2,
            shapeBackrestWidth + SHADOW_WIDTH
          )
          ctx.lineTo(shapeArmrestWidth + SHADOW_WIDTH - 2, shapeHeight)
          ctx.moveTo(
            shapeArmrestWidth + SHADOW_WIDTH - 2,
            shapeBackrestWidth + SHADOW_WIDTH + 2
          )
          ctx.lineTo(shapeWidth - 2, shapeBackrestWidth + SHADOW_WIDTH + 2)
          // ctx.moveTo(
          //   shapeWidth - SHADOW_WIDTH + 2,
          //   BACK_REST_WIDTH + SHADOW_WIDTH,
          // )
          // ctx.lineTo(shapeWidth - SHADOW_WIDTH + 2, shapeHeight - 2)

          ctx.fillStrokeShape(shape)
        }}
        stroke={MAIN_SHAPE_SHADOW_COLOR}
        strokeWidth={SHADOW_WIDTH}
      />

      {!hideSofa && (
        <>
          <Group
            // ---
            offsetX={shapeWidth / 2}
            offsetY={shapeHeight / 2}
            // We need to set x, y, origin in center
            x={shapeWidth / 2 + shapeOffsetFix}
            y={shapeHeight / 2 - shapeOffsetFix}
            rotation={rotation}
          >
            <Shape
              // ---
              // offsetX={shapeWidth / 2}
              // offsetY={shapeHeight / 2}
              // // We need to set x, y, origin in center
              // x={shapeWidth / 2 + shapeOffsetFix}
              // y={shapeHeight / 2 - shapeOffsetFix}
              // rotation={rotation}
              //----
              fill={BED_FORM_COLOR}
              sceneFunc={(ctx, shape) => {
                ctx.beginPath()
                ctx.rect(
                  shapeStartingX,
                  shapeBackrestWidth + SHADOW_WIDTH + 1,
                  finalMatressWidht,
                  shapeMattressLength
                )

                // Center line
                ctx.moveTo(
                  shapeStartingX,
                  shapeBackrestWidth +
                    SHADOW_WIDTH +
                    1 +
                    shapeMattressLength / 3
                )
                ctx.lineTo(
                  shapeStartingX + finalMatressWidht - 2,
                  shapeBackrestWidth +
                    SHADOW_WIDTH +
                    1 +
                    shapeMattressLength / 3
                )
                // Triginle left line
                ctx.moveTo(
                  shapeStartingX,
                  shapeBackrestWidth +
                    SHADOW_WIDTH +
                    1 +
                    shapeMattressLength / 3
                )
                ctx.lineTo(
                  shapeMattressWidth - shapeMattressWidth / 3,
                  shapeBackrestWidth +
                    SHADOW_WIDTH +
                    1 +
                    shapeMattressLength / 2
                )
                // Triginle right line
                ctx.moveTo(
                  shapeMattressWidth - shapeMattressWidth / 3,
                  shapeBackrestWidth +
                    SHADOW_WIDTH +
                    1 +
                    shapeMattressLength / 2
                )
                ctx.lineTo(
                  shapeStartingX + (finalMatressWidht - 2),
                  shapeBackrestWidth +
                    SHADOW_WIDTH +
                    1 +
                    shapeMattressLength / 3
                )

                ctx.fillStrokeShape(shape)
              }}
              stroke="black"
              strokeWidth={1}
              name={'sofa_shape_bed'}
            />

            <VerticalMetric
              x={shapeStartingX}
              y={shapeBackrestWidth + SHADOW_WIDTH + 1}
              height={shapeMattressLength}
              width={null}
            />
            <HorizontalMetric
              x={shapeStartingX}
              y={shapeBackrestWidth + SHADOW_WIDTH + 1}
              height={null}
              value={shapeMattressWidth}
              width={finalMatressWidht - 4}
            />
          </Group>
        </>
      )}

      {showButtons && (
        <>
          <Group
            x={20 + 37 + 37}
            y={20}
            opacity={0.8}
            onClick={e => onSofaHide(id)}
            onTouchEnd={e => onSofaHide(id)}
          >
            <Circle x={0} y={0} radius={17} fill={'white'} />
            <Image
              x={-8}
              y={-11}
              image={hideSofa ? anglesDownIcon : anglesUpIcon}
              width={17}
              height={20}
            />
          </Group>
        </>
      )}
      {(props.enabled_connectors == false ? [] : connectors)?.map(
        (conn, index) => (
          <Gizmo
            key={`gizmo-${index}`}
            settings={conn}
            // shapeRotation={rotation}
            shapeHeight={shapeHeight}
            shapeWidth={shapeWidth}
          />
        )
      )}
    </Group>
  )
}

export default SLEEPL
