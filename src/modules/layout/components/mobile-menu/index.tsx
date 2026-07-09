"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signout } from "@lib/data/customer"
import { useTranslations, CompactLanguageSwitcher } from "@lib/i18n"
import { ExtendedStoreCustomer } from "@lib/types/customer"
import type { MenuItem } from "@modules/layout/components/nav-menu-item"

interface MobileMenuProps {
  customer: ExtendedStoreCustomer | null
  isOpen: boolean
  onClose: () => void
  isLoggedIn: boolean
  navItems?: MenuItem[]
}

const MobileMenu = ({
  customer,
  isOpen,
  onClose,
  isLoggedIn,
  navItems = [],
}: MobileMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const { languageCode } = useParams() as { languageCode: string }
  const { t } = useTranslations("common")
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleLogout = async () => {
    await signout(languageCode)
    onClose()
    // Force a page refresh to clear client-side cache and show login form
    window.location.reload()
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      // Don't close if clicking on the menu itself
      if (menuRef.current && menuRef.current.contains(target)) {
        return
      }

      // Don't close if clicking on the mobile menu button
      const mobileMenuButton = document.querySelector(
        '[data-testid="mobile-menu-button"]'
      )
      if (mobileMenuButton && mobileMenuButton.contains(target)) {
        return
      }

      onClose()
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleEscapeKey)
      // Prevent body scroll when menu is open
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscapeKey)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  const displayName = customer?.full_name || customer?.name || "Test User"

  // Show menu if user appears to be logged in
  // This will be validated by the parent component's isLoggedIn logic
  if (!isLoggedIn) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ top: "var(--nav-height)" }} // Start below navigation (mobile has no top bar)
      />

      {/* Mobile Menu */}
      <div
        ref={menuRef}
        className={`fixed left-0 bg-white shadow-lg z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? "transform translate-x-0" : "transform -translate-x-full"
        }`}
        style={{
          top: "var(--nav-height)", // Start below navigation (mobile has no top bar)
          height: "calc(100vh - var(--nav-height))", // Full height minus navigation
          width: "280px",
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-6 border-b border-ui-border-base">
            <h2 className="text-lg font-medium text-dark-blue">
              {displayName}
            </h2>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Site Navigation Items */}
            {navItems.length > 0 && (
              <div className="py-4">
                {navItems.map((item) => {
                  if (item.type === "link") {
                    return (
                      <LocalizedClientLink
                        key={item.id}
                        href={item.href}
                        className="flex items-center px-6 py-4 text-base text-dark-blue hover:bg-ui-bg-subtle transition-colors"
                        onClick={onClose}
                        data-testid={`mobile-menu-nav-${item.id}-link`}
                      >
                        <span>{item.label}</span>
                      </LocalizedClientLink>
                    )
                  }

                  if (item.type === "dropdown" && item.dropdown) {
                    const isExpanded = !!expandedItems[item.id]
                    const subItems = item.dropdown.items

                    return (
                      <div key={item.id}>
                        {/* Toggle row */}
                        <button
                          type="button"
                          className="flex items-center justify-between w-full px-6 py-4 text-base text-dark-blue hover:bg-ui-bg-subtle transition-colors text-left"
                          onClick={() => toggleItem(item.id)}
                          data-testid={`mobile-menu-nav-${item.id}-toggle`}
                          aria-expanded={isExpanded}
                        >
                          <span>{item.label}</span>
                          <svg
                            className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {/* Expanded sub-items */}
                        {isExpanded && subItems.length > 0 && (
                          <div className="bg-ui-bg-subtle">
                            {subItems.map((subItem, index) => (
                              <LocalizedClientLink
                                key={index}
                                href={
                                  typeof subItem.href === "string"
                                    ? subItem.href
                                    : null
                                }
                                className="flex items-center pl-10 pr-6 py-3 text-sm text-dark-blue hover:bg-ui-bg-base transition-colors"
                                onClick={onClose}
                                data-testid={`mobile-menu-nav-${item.id}-subitem-${index}`}
                              >
                                {subItem.label}
                              </LocalizedClientLink>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return null
                })}
              </div>
            )}

            {/* Separator between site-nav and account items */}
            {navItems.length > 0 && (
              <div className="border-t border-ui-border-base" />
            )}

            {/* Account Items */}
            <div className="py-4">
              <LocalizedClientLink
                href="/account"
                className="flex items-center gap-x-3 px-6 py-4 text-base text-dark-blue hover:bg-ui-bg-subtle transition-colors"
                onClick={onClose}
                data-testid="mobile-menu-overview-link"
              >
                <Image
                  src="/images/profile-icon.svg"
                  alt="Profile"
                  width={20}
                  height={20}
                />
                <span>{t("overview")}</span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/account/orders"
                className="flex items-center gap-x-3 px-6 py-4 text-base text-dark-blue hover:bg-ui-bg-subtle transition-colors"
                onClick={onClose}
                data-testid="mobile-menu-orders-link"
              >
                <Image
                  src="/images/orders-icon.svg"
                  alt="Orders"
                  width={20}
                  height={20}
                />
                <span>{t("orders")}</span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/account/carts"
                className="flex items-center gap-x-3 px-6 py-4 text-base text-dark-blue hover:bg-ui-bg-subtle transition-colors"
                onClick={onClose}
                data-testid="mobile-menu-carts-link"
              >
                <Image
                  src="/images/orders-icon.svg"
                  alt="Carts"
                  width={20}
                  height={20}
                />
                <span>{t("carts")}</span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/account/fabric-palettes"
                className="flex items-center gap-x-3 px-6 py-4 text-base text-dark-blue hover:bg-ui-bg-subtle transition-colors"
                onClick={onClose}
                data-testid="mobile-menu-fabric-palettes-link"
              >
                <Image
                  src="/images/fabric-palettes-icon.svg"
                  alt="Fabric Palette"
                  width={20}
                  height={20}
                />
                <span>{t("fabric-palettes")}</span>
              </LocalizedClientLink>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="px-6 py-4 border-t border-ui-border-base">
            <CompactLanguageSwitcher size="default" dropdownAlign="left" />
          </div>

          {/* Logout Button */}
          <div className="border-t border-ui-border-base p-4">
            <button
              type="button"
              className="flex items-center gap-x-3 px-6 py-4 text-base text-dark-blue hover:bg-ui-bg-subtle transition-colors w-full text-left"
              onClick={handleLogout}
              data-testid="mobile-menu-logout-button"
            >
              <Image
                src="/images/logout-icon.svg"
                alt="Logout"
                width={20}
                height={20}
              />
              <span>{t("log-out")}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default MobileMenu
