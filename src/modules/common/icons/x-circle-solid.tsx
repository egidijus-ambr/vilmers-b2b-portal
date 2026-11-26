import React from "react"

import { IconProps } from "types/icon"

// Path data copied from the Medusa icon set (MIT, (c) 2023 Medusajs) so the UI is unchanged.

const XCircleSolid: React.FC<IconProps> = ({
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
      <path
        fill={color}
        d="M7.5.389C3.58.389.389 3.579.389 7.5s3.19 7.111 7.111 7.111 7.111-3.19 7.111-7.111S11.421.389 7.5.389m2.916 9.084a.667.667 0 0 1-.943.943L7.5 8.443l-1.973 1.973a.665.665 0 0 1-.943 0 .667.667 0 0 1 0-.943L6.558 7.5 4.584 5.527a.667.667 0 1 1 .944-.943L7.5 6.557l1.973-1.973a.667.667 0 0 1 .943.943L8.444 7.5l1.973 1.973z"
      />
    </svg>
  )
}

export default XCircleSolid
