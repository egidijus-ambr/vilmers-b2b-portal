import React from "react"

import { IconProps } from "types/icon"

const ArrowLeft: React.FC<IconProps> = ({
  size = "24",
  color = "currentColor",
  ...attributes
}) => {
  // Map Tailwind color names to CSS custom properties
  const getStrokeColor = (colorName: string) => {
    const colorMap: Record<string, string> = {
      "dark-blue": "#222D37",
      "dark-blue-70": "#646C73",
      gold: "#9A8555",
      white: "#FFFFFF",
      currentColor: "currentColor",
    }

    return colorMap[colorName] || colorName
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <path
        d="M6.12793 7.252L1.75403 11.6259L6.12793 15.9998"
        stroke={getStrokeColor(color)}
        strokeWidth="1.2"
        strokeLinecap="square"
      />
      <path
        d="M2.23633 11.626H24.0001"
        stroke={getStrokeColor(color)}
        strokeWidth="1.2"
        strokeLinecap="square"
      />
    </svg>
  )
}

export default ArrowLeft
