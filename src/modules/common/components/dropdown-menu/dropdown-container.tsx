"use client"

import { ReactNode } from "react"

interface DropdownContainerProps {
  isOpen: boolean
  width?: string
  position?: "left" | "right" | "center" | "mega"
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
  // "mega" ignores `width` and spans the full width of the nearest
  // positioned ancestor (the `<header>`, when the caller omits `relative`
  // on its own wrapper — see nav-menu-item.tsx) instead of the small
  // per-trigger `width`, so a wide mega-menu panel never overflows the
  // viewport regardless of where its trigger sits in the nav.
  if (position === "mega") {
    return (
      <div
        className={`absolute inset-x-0 top-full bg-white shadow-lg transition-all duration-200 z-50 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        } ${className}`}
      >
        {children}
      </div>
    )
  }

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
