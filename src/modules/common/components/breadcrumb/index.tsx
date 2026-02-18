"use client"

import React from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export interface BreadcrumbItem {
  label: string
  href: string | null
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  variant?: "default" | "light"
}

const ChevronRight = ({ className }: { className?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    className={className ?? "text-gray-400 flex-shrink-0"}
  >
    <path
      d="M6 3L11 8L6 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const Breadcrumb = ({ items, variant = "default" }: BreadcrumbProps) => {
  const isLight = variant === "light"

  return (
    <nav aria-label="Breadcrumb" className={isLight ? "" : "mb-8"}>
      <ol className="flex items-center flex-wrap gap-3 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className="flex items-center gap-3">
              {item.href ? (
                <LocalizedClientLink
                  href={item.href}
                  className={
                    isLight
                      ? "text-white/80 hover:text-white transition-colors"
                      : "text-gray-500 hover:text-dark-blue transition-colors"
                  }
                >
                  {item.label}
                </LocalizedClientLink>
              ) : (
                <span
                  className={
                    isLight
                      ? "text-white font-medium"
                      : "text-dark-blue font-medium"
                  }
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden="true">
                  <ChevronRight
                    className={
                      isLight
                        ? "text-white/60 flex-shrink-0"
                        : "text-gray-400 flex-shrink-0"
                    }
                  />
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumb
