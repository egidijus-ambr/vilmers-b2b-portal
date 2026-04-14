"use client"

import { useEffect, useState } from "react"

interface ToastProps {
  message: string
  type?: "success" | "error"
  duration?: number
  onClose: () => void
  cartItemCount?: number
  cartHref?: string
}

const Toast = ({ message, type = "success", duration = 5000, onClose, cartItemCount, cartHref }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true))

    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade-out animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999]">
      <div
        className={`flex items-center px-6 py-3 shadow-lg text-white text-sm font-medium transition-all duration-300 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        } ${type === "success" ? "bg-[#1e2a3a]" : "bg-red-600"}`}
      >
        <span>{message}</span>
        {cartItemCount != null && cartHref && (
          <a
            href={cartHref}
            className="ml-4 px-4 py-1.5 bg-white text-[#1e2a3a] text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Cart ({cartItemCount})
          </a>
        )}
      </div>
    </div>
  )
}

export default Toast
