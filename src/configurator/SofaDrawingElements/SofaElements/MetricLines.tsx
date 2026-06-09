import React, { useCallback, useState } from 'react'
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
} from 'react-konva'

import { MAIN_METRIC_COLOR, METRIC_SIZE } from './constants'
import Konva from 'konva'

interface VerticalMetricProps {
  x: number
  y: number
  width?: number | null
  height: number
  fontSize?: number
  position?: 'left' | 'right' | null
  value?: number
  labelBackground?: string
}

interface HorizontalMetricProps {
  x: number
  y: number
  width: number
  height?: number | null
  fontSize?: number
  value?: number
  labelBackground?: string
}

interface MetricKonvaNodeProps {
  x: number
  y: number
  width: number
  height: number
  fontSize?: number
  labelBackground?: string
}

export const VerticalMetric = ({
  x,
  y,
  width,
  height,
  fontSize = 12,
  position = null,
  labelBackground = 'white',
}: VerticalMetricProps) => {
  height = Math.round(height)

  const textPosition =
    position === 'right'
      ? {
          x: METRIC_SIZE / 2 + 5,
          y: Math.min(height / 2, height - 20),
        }
      : { x: METRIC_SIZE / 2 - 30, y: Math.min(height / 2, height - 20) }

  return (
    <Group x={x} y={y}>
      <Arrow
        points={[METRIC_SIZE / 2, 0, METRIC_SIZE / 2, height - 4]}
        stroke="black"
        fill={MAIN_METRIC_COLOR}
        pointerAtBeginning
        strokeWidth={0.5}
        pointerWidth={5}
        pointerLength={5}
      />
      {/* <Line
        points={[METRIC_SIZE / 3, 0, METRIC_SIZE, 0]}
        stroke="black"
        strokeWidth={0.5}
      />
      <Line
        points={[METRIC_SIZE / 3, height, METRIC_SIZE, height]}
        stroke="black"
        strokeWidth={0.5}
      /> */}
      <Label x={textPosition.x} y={textPosition.y}>
        <Tag fill={labelBackground} />
        <Text
          text={height + ' cm'}
          padding={2}
          fill="black"
          fontSize={fontSize}
          fontFamily="Arial"
          align="center"
          verticalAlign="middle"
        />
      </Label>
    </Group>
  )
}
// USED IN DRAWING STAGE
export const VerticalMetricKonvaNode = ({
  x,
  y,
  width,
  height,
  fontSize = 12,
  labelBackground = '#F5F3EE',
}: MetricKonvaNodeProps) => {
  //-----
  const num = (n: number) => (Number.isFinite(n) ? n : 0)
  x = num(x)
  y = num(y)
  width = num(width)
  height = num(height)

  let group = new Konva.Group({
    name: 'metricLine',
    x: x - METRIC_SIZE,
    y: y,
  })

  let arrow = new Konva.Arrow({
    points: [METRIC_SIZE / 2, 0, METRIC_SIZE / 2, height],
    stroke: 'black',
    fill: MAIN_METRIC_COLOR,
    pointerAtBeginning: true,
    strokeWidth: 0.5,
    pointerWidth: 5,
    pointerLength: 5,
  })

  // let line1 = new Konva.Line({
  //   points: [0, 0, METRIC_SIZE, 0],
  //   stroke: 'black',
  //   strokeWidth: 0.5,
  // })

  // let line2 = new Konva.Line({
  //   points: [0, height, METRIC_SIZE, height],
  //   stroke: 'black',
  //   strokeWidth: 0.5,
  // })

  let text = new Konva.Text({
    x: METRIC_SIZE / 2 - 25,
    y: height / 2,
    text: height + ' cm',
    padding: 5,
    fontSize: fontSize,
    fill: 'black',
    fontFamily: 'Arial',
    align: 'center',
    verticalAlign: 'middle',
  })

  // Create background rectangle for text
  let textBounds = text.getClientRect()
  let textBackground = new Konva.Rect({
    x: text.x() - 1,
    y: text.y() - 1,
    width: textBounds.width + 2,
    height: textBounds.height + 2,
    fill: labelBackground,
  })

  group.add(arrow)
  // group.add(line1)
  // group.add(line2)
  group.add(textBackground)
  group.add(text)

  return group
}

export const HorizontalMetric = ({
  x,
  y,
  width,
  height,
  fontSize = 12,
  value,
  labelBackground = 'white',
}: HorizontalMetricProps) => {
  width = Math.round(width)
  return (
    <Group x={x} y={y}>
      <Arrow
        points={[0, METRIC_SIZE / 2, width, METRIC_SIZE / 2]}
        stroke="black"
        fill={MAIN_METRIC_COLOR}
        pointerAtBeginning
        strokeWidth={0.5}
        pointerWidth={5}
        pointerLength={5}
      />
      {/* <Line
        points={[0, METRIC_SIZE / 3, 0, METRIC_SIZE]}
        stroke="black"
        strokeWidth={0.5}
      />
      <Line
        points={[width, METRIC_SIZE / 3, width, METRIC_SIZE]}
        stroke="black"
        strokeWidth={0.5}
      /> */}
      <Label x={width / 2 - 20} y={METRIC_SIZE / 2 - 10}>
        <Tag fill={labelBackground} />
        <Text
          text={(value || width) + ' cm'}
          padding={2}
          fill="black"
          fontSize={fontSize}
          fontFamily="Arial"
          align="center"
          verticalAlign="middle"
        />
      </Label>
    </Group>
  )
}

// USED IN DRAWING STAGE
export const HorizontalMetricKonvaNode = ({
  x,
  y,
  width,
  height,
  fontSize = 12,
  labelBackground = '#F5F3EE',
}: MetricKonvaNodeProps) => {
  //-----
  const num = (n: number) => (Number.isFinite(n) ? n : 0)
  x = num(x)
  y = num(y)
  width = num(width)
  height = num(height)

  let group = new Konva.Group({
    name: 'metricLine',
    x: x,
    y: y - METRIC_SIZE,
  })

  let arrow = new Konva.Arrow({
    points: [0, METRIC_SIZE / 2, width, METRIC_SIZE / 2],
    stroke: 'black',
    fill: MAIN_METRIC_COLOR,
    pointerAtBeginning: true,
    strokeWidth: 0.5,
    pointerWidth: 5,
    pointerLength: 5,
  })

  // let line1 = new Konva.Line({
  //   points: [0, 0, 0, METRIC_SIZE],
  //   stroke: 'black',
  //   strokeWidth: 0.5,
  // })

  // let line2 = new Konva.Line({
  //   points: [width, 0, width, METRIC_SIZE],
  //   stroke: 'black',
  //   strokeWidth: 0.5,
  // })

  let text = new Konva.Text({
    x: width / 2 - 20,
    y: METRIC_SIZE / 2 - 10,
    text: width + ' cm',
    padding: 5,
    fontSize: fontSize,
    fill: 'black',
    fontFamily: 'Arial',
    align: 'center',
    verticalAlign: 'middle',
  })

  // Create background rectangle for text
  let textBounds = text.getClientRect()
  let textBackground = new Konva.Rect({
    x: text.x() - 2,
    y: text.y() - 2,
    width: textBounds.width + 4,
    height: textBounds.height + 4,
    fill: labelBackground,
  })

  group.add(arrow)
  // group.add(line1)
  // group.add(line2)
  group.add(textBackground)
  group.add(text)

  return group
}
