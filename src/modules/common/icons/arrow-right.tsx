import React from "react"

import { IconProps } from "types/icon"

const ArrowRight: React.FC<IconProps> = ({
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
        d="M19.8721 16.748L24.246 12.3741L19.8721 8.00019"
        stroke={getStrokeColor(color)}
        strokeWidth="1.2"
        strokeLinecap="square"
      />
      <path
        d="M23.7637 12.374L2.00015 12.374"
        stroke={getStrokeColor(color)}
        strokeWidth="1.2"
        strokeLinecap="square"
      />
    </svg>
  )
}

export default ArrowRight
