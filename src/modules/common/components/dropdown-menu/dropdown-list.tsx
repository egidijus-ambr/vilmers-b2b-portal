"use client"

import { ReactNode } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export interface DropdownListItem {
  label: string | ReactNode
  href: string
  hasSubmenu?: boolean
  onClick?: () => void
  submenu?: {
    title: string
    items: DropdownListItem[]
  }
}

interface DropdownListProps {
  items: DropdownListItem[]
  activeSubmenu: string | null
  activeSubSubmenu: string | null
  onSubmenuEnter: (itemLabel: string) => void
  onSubmenuLeave: () => void
  onSubSubmenuEnter: (itemLabel: string) => void
  onSubSubmenuLeave: () => void
  spacing?: "compact" | "normal" | "spacious"
  level?: number
}

export default function DropdownList({
  items,
  activeSubmenu,
  activeSubSubmenu,
  onSubmenuEnter,
  onSubmenuLeave,
  onSubSubmenuEnter,
  onSubSubmenuLeave,
  spacing = "normal",
  level = 0,
}: DropdownListProps) {
  const spacingClasses = {
    compact: "space-y-1",
    normal: "space-y-3",
    spacious: "space-y-6",
  }

  return (
    <div className="p-4">
      <ul className={spacingClasses[spacing]}>
        {items.map((item, index) => (
          <li key={index} className="relative">
            {item.hasSubmenu ? (
              <div
                className="relative"
                onMouseEnter={() =>
                  onSubmenuEnter(
                    typeof item.label === "string"
                      ? item.label
                      : `item-${index}`
                  )
                }
                onMouseLeave={onSubmenuLeave}
              >
                <div className="flex items-center justify-between text-sm text-ui-fg-base hover:text-ui-fg-interactive transition-colors cursor-pointer">
                  <LocalizedClientLink href={item.href} className="flex-1">
                    {item.label}
                  </LocalizedClientLink>
                  <svg
                    className="w-3 h-3 ml-1"
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
                </div>

                {/* Submenu */}
                {item.submenu && (
                  <div
                    className={`absolute left-full -top-4 ml-4 w-48 bg-white shadow-lg transition-all duration-200 z-${
                      60 + level * 10
                    } ${
                      activeSubmenu === item.label
                        ? "opacity-100 visible"
                        : "opacity-0 invisible"
                    }`}
                  >
                    <DropdownList
                      items={item.submenu.items}
                      activeSubmenu={activeSubSubmenu}
                      activeSubSubmenu=""
                      onSubmenuEnter={onSubSubmenuEnter}
                      onSubmenuLeave={onSubSubmenuLeave}
                      onSubSubmenuEnter={() => {}}
                      onSubSubmenuLeave={() => {}}
                      spacing={spacing}
                      level={level + 1}
                    />
                  </div>
                )}
              </div>
            ) : item.onClick ? (
              <button
                onClick={item.onClick}
                className="block w-full text-left text-sm text-ui-fg-base hover:text-ui-fg-interactive transition-colors p-0"
              >
                {item.label}
              </button>
            ) : (
              <LocalizedClientLink
                href={item.href}
                className="block text-sm text-ui-fg-base hover:text-ui-fg-interactive transition-colors"
              >
                {item.label}
              </LocalizedClientLink>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
