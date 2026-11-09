import React from 'react'
import { ICON_VIEWBOX, RotateIcon } from './BackrestIcon'

// The rotating-arrow artwork only occupies 10x10 of its 24 viewBox, so it is
// drawn at a larger viewBox scale to reach a ~13px footprint (incl. stroke).
export const ROTATE_ICON_SIZE = ICON_VIEWBOX * (16 / 15)

// ELECTRIC backrest icon (rotating arrow). x/y = centre of the icon.
// maxHeight caps the size for narrow backrest strips (default footprint ~13).
export const ArrowComponent = ({
  x,
  y,
  maxHeight = 20,
}: {
  x: number
  y: number
  maxHeight?: number
}) => (
  <RotateIcon
    x={x}
    y={y}
    size={ROTATE_ICON_SIZE * Math.min(1, (maxHeight || 20) / 20)}
  />
)
