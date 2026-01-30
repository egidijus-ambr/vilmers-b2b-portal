import React from 'react'
import { Line } from 'react-konva'

interface PillowComponentProps {
  x: number
  y: number
  rotation: number
  size: number
  stroke?: string
  strokeWidth?: number
  fill?: string
  tension?: number
}

const PillowComponent: React.FC<PillowComponentProps> = ({
  x,
  y,
  rotation,
  size,
  stroke = 'black',
  strokeWidth = 1,
  fill = '#ddd',
  tension = 0.3,
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
    />
  )
}

export default PillowComponent
