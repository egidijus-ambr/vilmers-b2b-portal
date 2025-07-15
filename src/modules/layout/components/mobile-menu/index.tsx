"use client"

import { useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signout } from "@lib/data/customer"

interface MobileMenuProps {
  customer: (HttpTypes.StoreCustomer & { full_name?: string }) | null
  isOpen: boolean
  onClose: () => void
}

const MobileMenu = ({ customer, isOpen, onClose }: MobileMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const { languageCode } = useParams() as { languageCode: string }

  const handleLogout = async () => {
    await signout(languageCode)
    onClose()
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

  const displayName = customer?.full_name || customer?.first_name || "Test User"

  // For testing purposes, show menu even without customer
  // if (!customer) {
  //   return null
  // }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ top: "72px" }} // Start below navigation
      />

      {/* Mobile Menu */}
      <div
        ref={menuRef}
        className={`fixed left-0 bg-white shadow-lg z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? "transform translate-x-0" : "transform -translate-x-full"
        }`}
        style={{
          top: "72px", // Start below navigation
          height: "calc(100vh - 72px)", // Full height minus navigation
          width: "280px",
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-6 border-b border-ui-border-base">
            <h2 className="text-lg font-medium text-dark-blue font-['Montserrat']">
              {displayName}
            </h2>
          </div>

          {/* Menu Items */}
          <div className="flex-1 py-4">
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
              <span>Overview</span>
            </LocalizedClientLink>

            <LocalizedClientLink
              href="/account/profile"
              className="flex items-center gap-x-3 px-6 py-4 text-base text-dark-blue hover:bg-ui-bg-subtle transition-colors"
              onClick={onClose}
              data-testid="mobile-menu-profile-link"
            >
              <Image
                src="/images/profile-icon.svg"
                alt="Profile"
                width={20}
                height={20}
              />
              <span>Profile</span>
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
              <span>Orders</span>
            </LocalizedClientLink>
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
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default MobileMenu
