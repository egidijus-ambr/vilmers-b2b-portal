"use client"

import { ReactNode } from "react"

interface DropdownTriggerProps {
  children: ReactNode
  isOpen: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  className?: string
  showArrow?: boolean
  arrowDirection?: "down" | "up"
}

export default function DropdownTrigger({
  children,
  isOpen,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className = "",
  showArrow = true,
  arrowDirection = "down",
}: DropdownTriggerProps) {
  const arrowRotation = isOpen
    ? arrowDirection === "down"
      ? "rotate-180"
      : "rotate-0"
    : arrowDirection === "down"
    ? "rotate-0"
    : "rotate-180"

  return (
    <button
      className={`flex items-center space-x-1 transition-colors ${className}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
      {showArrow && (
        <svg
          className={`w-4 h-4 transition-transform ${arrowRotation}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      )}
    </button>
  )
}
