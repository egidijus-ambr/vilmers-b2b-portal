import React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", children, ...props }, ref) => {
    const base =
      "px-8 py-3 text-sm font-medium rounded-button border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    const variants = {
      primary:
        "border-dark-blue bg-dark-blue text-white hover:opacity-90",
      secondary:
        "border-accent bg-accent text-white hover:bg-accent/90",
      outline:
        "border-dark-blue text-dark-blue hover:bg-gray-50",
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
