import React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", children, ...props }, ref) => {
    const base =
      "w-full text-sm font-medium rounded-full transition-all"
    const variants = {
      primary:
        "bg-dark-blue text-white py-4 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
      secondary:
        "border border-dark-blue text-dark-blue py-3 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed",
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
