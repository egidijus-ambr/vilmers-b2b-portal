"use client"

import { ReactNode } from "react"

interface DropdownContainerProps {
  isOpen: boolean
  width?: string
  position?: "left" | "right" | "center"
  children: ReactNode
  className?: string
}

export default function DropdownContainer({
  isOpen,
  width = "w-48",
  position = "left",
  children,
  className = "",
}: DropdownContainerProps) {
  const positionClasses = {
    left: "left-0",
    right: "right-0",
    center: "left-1/2 transform -translate-x-1/2",
  }

  return (
    <div
      className={`absolute ${
        positionClasses[position]
      } top-full mt-1 ${width} bg-white shadow-lg transition-all duration-200 z-50 ${
        isOpen ? "opacity-100 visible" : "opacity-0 invisible"
      } ${className}`}
    >
      {children}
    </div>
  )
}
