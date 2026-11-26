import React from "react"

import { IconProps } from "types/icon"

// Path data copied from the Medusa icon set (MIT, (c) 2023 Medusajs) so the UI is unchanged.

const DotSolid: React.FC<IconProps> = ({
  size = "15",
  color = "currentColor",
  ...attributes
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <circle cx="7.5" cy="7.5" r="2" fill={color} />
    </svg>
  )
}

export default DotSolid
