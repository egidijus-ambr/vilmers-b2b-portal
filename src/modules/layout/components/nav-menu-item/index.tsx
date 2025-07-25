"use client"

import { useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import DropdownContainer from "../dropdown-container"
import DropdownTrigger from "../dropdown-trigger"
import DropdownList, { DropdownListItem } from "../dropdown-list"

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

export interface DropdownItem extends DropdownListItem {}
export interface SubmenuItem extends DropdownListItem {}
export interface SubSubmenuItem extends DropdownListItem {}

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
  triggerClassName?: string
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
  triggerClassName,
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
        <DropdownTrigger
          isOpen={activeDropdown === item.id}
          className={
            triggerClassName ||
            `h-full px-4 py-2 text-sm  font-medium font-['Montserrat']  ${
              isHomePage
                ? "text-white hover:text-gray-200"
                : "text-ui-fg-subtle hover:text-ui-fg-base"
            }`
          }
        >
          <span>{item.label}</span>
        </DropdownTrigger>

        <DropdownContainer
          isOpen={activeDropdown === item.id}
          width={item.dropdown.width}
          position="left"
        >
          <DropdownList
            items={item.dropdown.items}
            activeSubmenu={activeSubmenu}
            activeSubSubmenu={activeSubSubmenu}
            onSubmenuEnter={onSubmenuEnter}
            onSubmenuLeave={onSubmenuLeave}
            onSubSubmenuEnter={onSubSubmenuEnter}
            onSubSubmenuLeave={onSubSubmenuLeave}
            spacing="spacious"
          />
        </DropdownContainer>
      </div>
    )
  }

  return null
}
