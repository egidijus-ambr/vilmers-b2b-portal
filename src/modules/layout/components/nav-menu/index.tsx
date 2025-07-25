"use client"

import { useState } from "react"
import NavMenuItem, { MenuItem } from "../nav-menu-item"

interface NavMenuProps {
  menuItems: MenuItem[]
  isHomePage: boolean
  triggerClassName?: string
}

export default function NavMenu({
  menuItems,
  isHomePage,
  triggerClassName,
}: NavMenuProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const [activeSubSubmenu, setActiveSubSubmenu] = useState<string | null>(null)

  const handleDropdownEnter = (itemId: string) => {
    setActiveDropdown(itemId)
  }

  const handleDropdownLeave = () => {
    setActiveDropdown(null)
    setActiveSubmenu(null)
    setActiveSubSubmenu(null)
  }

  const handleSubmenuEnter = (itemLabel: string) => {
    setActiveSubmenu(itemLabel)
  }

  const handleSubmenuLeave = () => {
    setActiveSubmenu(null)
    setActiveSubSubmenu(null)
  }

  const handleSubSubmenuEnter = (itemLabel: string) => {
    setActiveSubSubmenu(itemLabel)
  }

  const handleSubSubmenuLeave = () => {
    setActiveSubSubmenu(null)
  }

  return (
    <nav className="flex items-center space-x-4">
      {menuItems.map((item) => (
        <NavMenuItem
          key={item.id}
          item={item}
          isHomePage={isHomePage}
          activeDropdown={activeDropdown}
          activeSubmenu={activeSubmenu}
          activeSubSubmenu={activeSubSubmenu}
          onDropdownEnter={handleDropdownEnter}
          onDropdownLeave={handleDropdownLeave}
          onSubmenuEnter={handleSubmenuEnter}
          onSubmenuLeave={handleSubmenuLeave}
          onSubSubmenuEnter={handleSubSubmenuEnter}
          onSubSubmenuLeave={handleSubSubmenuLeave}
          triggerClassName={triggerClassName}
        />
      ))}
    </nav>
  )
}
