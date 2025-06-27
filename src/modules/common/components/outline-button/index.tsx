import React from "react"

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
        <svg
          className="ml-2 w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </button>
  )
}

export default OutlineButton
