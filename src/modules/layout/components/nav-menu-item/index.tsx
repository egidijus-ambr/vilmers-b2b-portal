"use client"

import { useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export interface MenuItem {
  id: string
  label: string
  type: "link" | "dropdown"
  href: string
  dropdown?: {
    width: string
    layout: "single-column"
    items: DropdownItem[]
  }
}

export interface DropdownItem {
  label: string
  href: string
  hasSubmenu?: boolean
  submenu?: {
    title: string
    items: SubmenuItem[]
  }
}

export interface SubmenuItem {
  label: string
  href: string
  hasSubmenu?: boolean
  submenu?: {
    title: string
    items: SubSubmenuItem[]
  }
}

export interface SubSubmenuItem {
  label: string
  href: string
}

interface NavMenuItemProps {
  item: MenuItem
  isHomePage: boolean
  activeDropdown: string | null
  activeSubmenu: string | null
  activeSubSubmenu: string | null
  onDropdownEnter: (itemId: string) => void
  onDropdownLeave: () => void
  onSubmenuEnter: (itemLabel: string) => void
  onSubmenuLeave: () => void
  onSubSubmenuEnter: (itemLabel: string) => void
  onSubSubmenuLeave: () => void
}

export default function NavMenuItem({
  item,
  isHomePage,
  activeDropdown,
  activeSubmenu,
  activeSubSubmenu,
  onDropdownEnter,
  onDropdownLeave,
  onSubmenuEnter,
  onSubmenuLeave,
  onSubSubmenuEnter,
  onSubSubmenuLeave,
}: NavMenuItemProps) {
  if (item.type === "link") {
    return (
      <LocalizedClientLink
        href={item.href}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          isHomePage
            ? "text-white hover:text-gray-200"
            : "text-ui-fg-subtle hover:text-ui-fg-base"
        }`}
      >
        {item.label}
      </LocalizedClientLink>
    )
  }

  if (item.type === "dropdown" && item.dropdown) {
    return (
      <div
        className="relative"
        onMouseEnter={() => onDropdownEnter(item.id)}
        onMouseLeave={onDropdownLeave}
      >
        <button
          className={`flex items-center space-x-1 h-full px-4 py-2 text-sm font-medium transition-colors ${
            isHomePage
              ? "text-white hover:text-gray-200"
              : "text-ui-fg-subtle hover:text-ui-fg-base"
          }`}
        >
          <span>{item.label}</span>
          <svg
            className={`w-4 h-4 transition-transform ${
              activeDropdown === item.id ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Dropdown */}
        <div
          className={`absolute left-0 top-full mt-1 ${
            item.dropdown.width
          } bg-white shadow-lg transition-all duration-200 z-50 ${
            activeDropdown === item.id
              ? "opacity-100 visible"
              : "opacity-0 invisible"
          }`}
        >
          <div className="p-4">
            <ul className="space-y-6">
              {item.dropdown.items?.map((subItem, subIndex) => (
                <li key={subIndex} className="relative">
                  {subItem.hasSubmenu ? (
                    <div
                      className="relative"
                      onMouseEnter={() => onSubmenuEnter(subItem.label)}
                      onMouseLeave={onSubmenuLeave}
                    >
                      <div className="flex items-center justify-between text-sm text-ui-fg-base hover:text-ui-fg-interactive transition-colors cursor-pointer">
                        <LocalizedClientLink
                          href={subItem.href}
                          className="flex-1"
                        >
                          {subItem.label}
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
                      {subItem.submenu && (
                        <div
                          className={`absolute left-full -top-4 ml-4 w-48 bg-white shadow-lg transition-all duration-200 z-60 ${
                            activeSubmenu === subItem.label
                              ? "opacity-100 visible"
                              : "opacity-0 invisible"
                          }`}
                        >
                          <div className="p-4">
                            <ul className="space-y-6">
                              {subItem.submenu.items.map(
                                (submenuItem, submenuIndex) => (
                                  <li key={submenuIndex} className="relative">
                                    {submenuItem.hasSubmenu ? (
                                      <div
                                        className="relative"
                                        onMouseEnter={() =>
                                          onSubSubmenuEnter(submenuItem.label)
                                        }
                                        onMouseLeave={onSubSubmenuLeave}
                                      >
                                        <div className="flex items-center justify-between text-sm text-ui-fg-base hover:text-ui-fg-interactive transition-colors cursor-pointer">
                                          <LocalizedClientLink
                                            href={submenuItem.href}
                                            className="flex-1"
                                          >
                                            {submenuItem.label}
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

                                        {/* Sub-submenu */}
                                        {submenuItem.submenu && (
                                          <div
                                            className={`absolute left-full -top-4 ml-4 w-48 bg-white shadow-lg transition-all duration-200 z-70 ${
                                              activeSubSubmenu ===
                                              submenuItem.label
                                                ? "opacity-100 visible"
                                                : "opacity-0 invisible"
                                            }`}
                                          >
                                            <div className="p-4">
                                              <ul className="space-y-6">
                                                {submenuItem.submenu.items.map(
                                                  (
                                                    subSubmenuItem,
                                                    subSubmenuIndex
                                                  ) => (
                                                    <li key={subSubmenuIndex}>
                                                      <LocalizedClientLink
                                                        href={
                                                          subSubmenuItem.href
                                                        }
                                                        className="block text-sm text-ui-fg-base hover:text-ui-fg-interactive transition-colors"
                                                      >
                                                        {subSubmenuItem.label}
                                                      </LocalizedClientLink>
                                                    </li>
                                                  )
                                                )}
                                              </ul>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <LocalizedClientLink
                                        href={submenuItem.href}
                                        className="block text-sm text-ui-fg-base hover:text-ui-fg-interactive transition-colors"
                                      >
                                        {submenuItem.label}
                                      </LocalizedClientLink>
                                    )}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <LocalizedClientLink
                      href={subItem.href}
                      className="block text-sm text-ui-fg-base hover:text-ui-fg-interactive transition-colors"
                    >
                      {subItem.label}
                    </LocalizedClientLink>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return null
}
