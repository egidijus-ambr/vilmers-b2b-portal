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
  /**
   * Reduces the breadcrumb's bottom margin (`mb-8` -> `mb-2`).
   *
   * The default `mb-8` exists to separate the breadcrumb from a page title
   * rendered directly below it. When a consumer has no title (e.g. a
   * no-hero CMS `PageHeader` in `compact` mode), that full gap is dead
   * space, so it's reduced to a small `mb-2` breathing gap instead of
   * removed entirely. Defaults to `false` so every existing consumer keeps
   * its current `mb-8` spacing untouched.
   */
  compact?: boolean
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

const Breadcrumb = ({
  items,
  variant = "default",
  compact = false,
}: BreadcrumbProps) => {
  const isLight = variant === "light"

  return (
    <nav aria-label="Breadcrumb" className={isLight ? "" : compact ? "mb-2" : "mb-8"}>
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
