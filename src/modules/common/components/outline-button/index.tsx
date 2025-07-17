import React from "react"
import ArrowRight from "@modules/common/icons/arrow-right"

interface OutlineButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  showArrow?: boolean
}

const OutlineButton: React.FC<OutlineButtonProps> = ({
  children,
  onClick,
  className = "",
  showArrow = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-6 py-3 border border-white text-white hover:bg-white hover:text-black transition-colors duration-200 rounded-3xl ${className}`}
    >
      {children}
      {showArrow && (
        <ArrowRight className="ml-2 -translate-y-[1px]" color="currentColor" />
      )}
    </button>
  )
}

export default OutlineButton
