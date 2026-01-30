import React, { useCallback, useEffect, useState } from 'react'
import { Arrow } from 'react-konva'

export const DoubleArrowComponent = ({ x, y, maxHeight = 20 }) => {
  // Calculate arrow height, ensuring it doesn't exceed maxHeight
  const defaultArrowHeight = 17
  const arrowHeight = maxHeight
    ? Math.min(defaultArrowHeight, maxHeight)
    : defaultArrowHeight

  // Adjust y position based on arrow height
  const adjustedY = y - arrowHeight / 2 + 2

  return (
    <>
      <Arrow
        x={x - 6}
        y={adjustedY - 2}
        points={[0, arrowHeight, 0, 0]}
        stroke="black"
        fill="black"
        strokeWidth={1}
        pointerWidth={7}
        pointerLength={7}
      />
      <Arrow
        x={x + 6}
        y={adjustedY - 2}
        points={[0, 0, 0, arrowHeight]}
        stroke="black"
        fill="black"
        strokeWidth={1}
        pointerWidth={7}
        pointerLength={7}
      />
    </>
  )
}
