import React, { useCallback, useEffect, useState } from 'react'
import { Arrow } from 'react-konva'

export const ArrowComponent = ({ x, y, maxHeight = 20 }) => {
  // Calculate arrow height, ensuring it doesn't exceed maxHeight
  const defaultArrowHeight = 17
  const arrowHeight = maxHeight
    ? Math.min(defaultArrowHeight, maxHeight)
    : defaultArrowHeight

  // Scale factor for proportional scaling of points
  const scaleFactor = arrowHeight / defaultArrowHeight

  // Original points scaled proportionally
  const scaledPoints = [
    10 * scaleFactor,
    2 * scaleFactor,
    7 * scaleFactor,
    -5 * scaleFactor,
    0,
    0,
    5 * scaleFactor,
    10 * scaleFactor,
  ]

  return (
    <Arrow
      x={x}
      y={y}
      points={scaledPoints}
      tension={0.5}
      // closed
      stroke="black"
      fill="black"
      strokeWidth={1}
      pointerWidth={7}
      pointerLength={7}
    />
  )
}
