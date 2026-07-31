"use client"

import { useEffect, useRef, useState } from "react"
import NavMenuItem, { MenuItem } from "../nav-menu-item"

interface NavMenuProps {
  menuItems: MenuItem[]
  isHomePage: boolean
  triggerClassName?: string
  isInteractive?: boolean
}

// Grace period before a hover-driven close actually applies. The trigger
// and its panel/flyout are separately hit-tested DOM regions (the panel is
// `position: absolute`, visually detached from the trigger's own box, with
// a gap between them — see NavMenuItem/DropdownList) — without this delay,
// moving the pointer through that gap resolves to whatever's rendered
// underneath (not a descendant of the hover wrapper), firing `mouseleave`
// mid-transit and closing the panel before the pointer arrives. Only
// closing is delayed; opening (`handle*Enter`) stays instant.
const HOVER_CLOSE_DELAY_MS = 200

export default function NavMenu({
  menuItems,
  isHomePage,
  triggerClassName,
  isInteractive = true,
}: NavMenuProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const [activeSubSubmenu, setActiveSubSubmenu] = useState<string | null>(null)

  // One timer per hover level, centralized here (not in NavMenuItem) since
  // `activeDropdown` etc. are single shared values, not per-item state —
  // a per-item timer would go on firing a stale close after the user has
  // already moved on to a different item. Re-entering (trigger, panel, or
  // any of the panel's own descendants — the wrapper's `onMouseEnter`
  // re-fires when the pointer lands on a DOM descendant even though it
  // renders elsewhere on screen) cancels the pending close via the
  // corresponding `handle*Enter` below.
  const dropdownCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const subSubmenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (dropdownCloseTimer.current) clearTimeout(dropdownCloseTimer.current)
      if (submenuCloseTimer.current) clearTimeout(submenuCloseTimer.current)
      if (subSubmenuCloseTimer.current) clearTimeout(subSubmenuCloseTimer.current)
    }
  }, [])

  const handleDropdownEnter = (itemId: string) => {
    if (dropdownCloseTimer.current) {
      clearTimeout(dropdownCloseTimer.current)
      dropdownCloseTimer.current = null
    }
    setActiveDropdown(itemId)
  }

  const handleDropdownLeave = () => {
    if (dropdownCloseTimer.current) clearTimeout(dropdownCloseTimer.current)
    dropdownCloseTimer.current = setTimeout(() => {
      setActiveDropdown(null)
      setActiveSubmenu(null)
      setActiveSubSubmenu(null)
      dropdownCloseTimer.current = null
    }, HOVER_CLOSE_DELAY_MS)
  }

  const handleSubmenuEnter = (itemLabel: string) => {
    if (submenuCloseTimer.current) {
      clearTimeout(submenuCloseTimer.current)
      submenuCloseTimer.current = null
    }
    setActiveSubmenu(itemLabel)
  }

  const handleSubmenuLeave = () => {
    if (submenuCloseTimer.current) clearTimeout(submenuCloseTimer.current)
    submenuCloseTimer.current = setTimeout(() => {
      setActiveSubmenu(null)
      setActiveSubSubmenu(null)
      submenuCloseTimer.current = null
    }, HOVER_CLOSE_DELAY_MS)
  }

  const handleSubSubmenuEnter = (itemLabel: string) => {
    if (subSubmenuCloseTimer.current) {
      clearTimeout(subSubmenuCloseTimer.current)
      subSubmenuCloseTimer.current = null
    }
    setActiveSubSubmenu(itemLabel)
  }

  const handleSubSubmenuLeave = () => {
    if (subSubmenuCloseTimer.current) clearTimeout(subSubmenuCloseTimer.current)
    subSubmenuCloseTimer.current = setTimeout(() => {
      setActiveSubSubmenu(null)
      subSubmenuCloseTimer.current = null
    }, HOVER_CLOSE_DELAY_MS)
  }

  return (
    <nav className="flex items-center space-x-2">
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
