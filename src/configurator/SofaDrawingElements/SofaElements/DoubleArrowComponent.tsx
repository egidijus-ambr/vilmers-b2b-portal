import React from 'react'
import { ICON_VIEWBOX, ArrowDownIcon, ArrowUpIcon } from './BackrestIcon'

// MECHANIC backrest icon: up arrow + down arrow side by side.
// x/y = centre of the pair. Footprint ~16 wide x ~13 tall at maxHeight 20
// (each arrow is 6x13.5 icon units + 2 stroke, drawn at scale 0.85).
export const DOUBLE_ARROW_SCALE = 0.85
const ARROW_OFFSET = 5.25 // icon units from the pair centre to each arrow centre

export const DoubleArrowComponent = ({
  x,
  y,
  maxHeight = 20,
}: {
  x: number
  y: number
  maxHeight?: number
}) => {
  const size =
    ICON_VIEWBOX * DOUBLE_ARROW_SCALE * Math.min(1, (maxHeight || 20) / 20)
  const dx = (ARROW_OFFSET * size) / ICON_VIEWBOX
  return (
    <>
      <ArrowUpIcon x={x - dx} y={y} size={size} />
      <ArrowDownIcon x={x + dx} y={y} size={size} />
    </>
  )
}
