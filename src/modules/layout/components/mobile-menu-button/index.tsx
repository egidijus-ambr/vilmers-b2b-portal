"use client"

interface MobileMenuButtonProps {
  isOpen: boolean
  onClick: () => void
  isHomePage?: boolean
}

const MobileMenuButton = ({
  isOpen,
  onClick,
  isHomePage = false,
}: MobileMenuButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClick()
  }

  return (
    <button
      className={`flex flex-col justify-center items-center w-6 h-6 ${
        isHomePage ? "text-white" : "text-dark-blue"
      }`}
      onClick={handleClick}
      aria-label="Toggle mobile menu"
      data-testid="mobile-menu-button"
    >
      <span
        className={`block w-5 h-0.5 bg-current transition-all duration-300 ease-in-out ${
          isOpen ? "rotate-45 translate-y-1.5" : ""
        }`}
      />
      <span
        className={`block w-5 h-0.5 bg-current transition-all duration-300 ease-in-out mt-1 ${
          isOpen ? "opacity-0" : ""
        }`}
      />
      <span
        className={`block w-5 h-0.5 bg-current transition-all duration-300 ease-in-out mt-1 ${
          isOpen ? "-rotate-45 -translate-y-1.5" : ""
        }`}
      />
    </button>
  )
}

export default MobileMenuButton
