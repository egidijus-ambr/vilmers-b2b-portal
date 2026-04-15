import React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", children, ...props }, ref) => {
    const base =
      "w-full text-sm font-medium rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    const variants = {
      primary:
        "bg-dark-blue text-white py-4 hover:opacity-90",
      secondary:
        "bg-gold text-white py-4 hover:bg-gold/90",
      outline:
        "border border-dark-blue text-dark-blue py-3 hover:bg-gray-50",
    }

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"

export default Button
