import React from 'react'
import { ArrowComponent } from './ArrowComponent'
import { DoubleArrowComponent } from './DoubleArrowComponent'

// Combined backrest type: mechanic arrows + electric (rotating) arrow.
// NOTE: not yet part of the backend BackrestType enum (needs migration).
export const MECHANIC_AND_ELECTRIC = 'MECHANIC_AND_ELECTRIC'

// Footprints at maxHeight 20: pair ~16w x 13h, rotating arrow ~13x13.
// Offsets below keep them from overlapping and scale with maxHeight.
export const MechanicAndElectricArrows = ({
  x,
  y,
  maxHeight = 20,
  stacked = false,
}: {
  x: number
  y: number
  maxHeight?: number
  stacked?: boolean
}) => {
  const k = Math.min(1, (maxHeight || 20) / 20)
  return stacked ? (
    // Narrow vertical strip: stack the two icons instead of side by side.
    <>
      <DoubleArrowComponent x={x} y={y - 9 * k} maxHeight={maxHeight} />
      <ArrowComponent x={x} y={y + 8 * k} maxHeight={maxHeight} />
    </>
  ) : (
    <>
      <DoubleArrowComponent x={x - 8 * k} y={y} maxHeight={maxHeight} />
      <ArrowComponent x={x + 9.5 * k} y={y} maxHeight={maxHeight} />
    </>
  )
}
