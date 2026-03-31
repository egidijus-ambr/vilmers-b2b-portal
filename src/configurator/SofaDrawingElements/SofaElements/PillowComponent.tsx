import React from 'react'
import { Line } from 'react-konva'
import { PILLOW_FILL_COLOR, PILLOW_STROKE_COLOR, PILLOW_STROKE_WIDTH, PILLOW_OPACITY } from './constants'

interface PillowComponentProps {
  x: number
  y: number
  rotation: number
  size: number
  stroke?: string
  strokeWidth?: number
  fill?: string
  tension?: number
  opacity?: number
}

const PillowComponent: React.FC<PillowComponentProps> = ({
  x,
  y,
  rotation,
  size,
  stroke = PILLOW_STROKE_COLOR,
  strokeWidth = PILLOW_STROKE_WIDTH,
  fill = PILLOW_FILL_COLOR,
  tension = 0.3,
  opacity = PILLOW_OPACITY,
}) => {
  return (
    <Line
      x={x}
      y={y}
      rotation={rotation}
      offsetX={size / 2}
      points={[0, 0, size / 2, -size / 5, size, 0, size / 2, size / 5]}
      tension={tension}
      closed
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill={fill}
      opacity={opacity}
    />
  )
}

export default PillowComponent
