import React from 'react'
import { Group, Path } from 'react-konva'

// Reusable stroke-based icon (24x24 viewBox, stroke 2, round caps/joins, no
// fill). `x`/`y` is the CENTRE of the icon's real bounding box (`bbox`), so the
// artwork is centred even when the path doesn't fill the viewBox. Being a
// Group child it rotates with the parent shape Group like any other node.
export type IconBBox = { cx: number; cy: number }

export const ICON_VIEWBOX = 24

export const BackrestIcon = ({
  x,
  y,
  size = ICON_VIEWBOX,
  paths,
  bbox,
  strokeWidth = 2,
}: {
  x: number
  y: number
  /** Rendered size of the 24-unit viewBox, in canvas px */
  size?: number
  paths: string[]
  bbox: IconBBox
  /** Stroke in icon units (default 2) */
  strokeWidth?: number
}) => (
  <Group
    x={x}
    y={y}
    scaleX={size / ICON_VIEWBOX}
    scaleY={size / ICON_VIEWBOX}
    offsetX={bbox.cx}
    offsetY={bbox.cy}
    listening={false}
  >
    {paths.map((d, i) => (
      <Path
        key={i}
        data={d}
        stroke="black"
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        fillEnabled={false}
        listening={false}
      />
    ))}
  </Group>
)

// --- Icon artwork (24x24 viewBox) -----------------------------------------

// Rotating arrow (ELECTRIC). NOTE: Konva's SVG path parser does NOT understand
// compact arc flags ("a5 5 0 009-3" -> rx ry rot large sweep x y), so the
// arc flags are written out explicitly here. Geometry is identical to the
// supplied icon. Real bbox is x 7-17, y 11-21 (only 10x10 of the 24 box).
export const ROTATE_PATHS = [
  'M7 11v4h4',
  'M8 19a5 5 0 0 0 9 -3 4.5 4.5 0 0 0 -4.5 -4.5 4.82 4.82 0 0 0 -3.41 1.41L7 15',
]
export const ROTATE_BBOX: IconBBox = { cx: 12, cy: 16 }

// Down arrow, stem lengthened (supplied icon is y 12-21; this is y 3-21) so it
// fills the box. Centred on (12, 12).
// Stem shortened to 75% (13.5 units, y 7.5-21); head unchanged. Centre (12, 14.25).
export const ARROW_DOWN_PATHS = ['M12 7.5v13.5', 'm9 18 3 3 3-3']
export const ARROW_DOWN_BBOX: IconBBox = { cx: 12, cy: 14.25 }

export const RotateIcon = (p: { x: number; y: number; size?: number }) => (
  // Drawn at 16/15 scale (see ArrowComponent), so stroke 1.6 units ~= 1.7px,
  // matching the arrows' line weight.
  <BackrestIcon
    {...p}
    paths={ROTATE_PATHS}
    bbox={ROTATE_BBOX}
    strokeWidth={1.6}
  />
)

export const ArrowDownIcon = (p: { x: number; y: number; size?: number }) => (
  <BackrestIcon {...p} paths={ARROW_DOWN_PATHS} bbox={ARROW_DOWN_BBOX} />
)

// Same arrow rotated 180deg about its own centre.
export const ArrowUpIcon = (p: { x: number; y: number; size?: number }) => (
  <BackrestIcon
    {...p}
    paths={['M12 21V7.5', 'm9 10.5 3-3 3 3']}
    bbox={ARROW_DOWN_BBOX}
  />
)
