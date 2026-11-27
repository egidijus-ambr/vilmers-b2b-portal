"use client"

import React from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useTranslations } from "@lib/i18n"

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

/**
 * The one breadcrumb trail. Sizing is responsive: `text-xs`, tight gaps and
 * small chevrons below `xsmall` (512px), `text-sm` / `gap-3` / 16px chevrons
 * from `xsmall` up.
 *
 * Vertical rhythm: the default variant owns `py-3 xsmall:py-5`, so callers
 * must NOT add their own margin/padding around it. The `light` variant (over
 * a hero image) has identical sizing and colours-only differences, but no
 * padding, because the hero's own container already provides it.
 */
const Breadcrumb = ({ items, variant = "default" }: BreadcrumbProps) => {
  const { t } = useTranslations("common")
  const isLight = variant === "light"

  return (
    <nav
      aria-label={t("breadcrumb")}
      className={isLight ? "" : "py-3 xsmall:py-5"}
    >
      <ol className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-xs xsmall:gap-3 xsmall:text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li
              key={index}
              className="flex items-center gap-1.5 xsmall:gap-3"
            >
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
                    className={`w-3 h-3 xsmall:w-4 xsmall:h-4 flex-shrink-0 ${
                      isLight ? "text-white/60" : "text-gray-400"
                    }`}
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

/**
 * Full-width breadcrumb strip (page background + gutter + content container)
 * for pages that have nothing else in their header, e.g. the configurator.
 */
export const BreadcrumbBar = ({ items }: { items: BreadcrumbItem[] }) => (
  <div className="bg-page-background w-full page-gutter">
    <div className="content-container">
      <Breadcrumb items={items} />
    </div>
  </div>
)

export default Breadcrumb
