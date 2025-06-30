"use client"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import { ArrowRightOnRectangle } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import User from "@modules/common/icons/user"
import Package from "@modules/common/icons/package"
import { signout } from "@lib/data/customer"

interface AccountDropdownProps {
  customer: (HttpTypes.StoreCustomer & { full_name?: string }) | null
}

const AccountDropdown = ({ customer }: AccountDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { countryCode } = useParams() as { countryCode: string }

  const handleLogout = async () => {
    await signout(countryCode)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const displayName = customer?.full_name || customer?.first_name || "Account"

  if (!customer) {
    return (
      <LocalizedClientLink
        className="hover:text-ui-fg-base"
        href="/account"
        data-testid="nav-account-link"
      >
        Account
      </LocalizedClientLink>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center gap-x-1 hover:text-ui-fg-base"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="account-dropdown-trigger"
      >
        <span>{displayName}</span>
        <ChevronDown
          className={clx("transition-transform duration-200", {
            "rotate-180": isOpen,
          })}
          size={16}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-ui-border-base rounded-md shadow-lg z-50">
          <div className="py-1">
            <LocalizedClientLink
              href="/account"
              className="flex items-center gap-x-2 px-4 py-2 text-sm hover:bg-ui-bg-subtle"
              onClick={() => setIsOpen(false)}
              data-testid="dropdown-dashboard-link"
            >
              <User size={16} />
              <span>Dashboard</span>
            </LocalizedClientLink>

            <LocalizedClientLink
              href="/account/profile"
              className="flex items-center gap-x-2 px-4 py-2 text-sm hover:bg-ui-bg-subtle"
              onClick={() => setIsOpen(false)}
              data-testid="dropdown-profile-link"
            >
              <User size={16} />
              <span>Profile</span>
            </LocalizedClientLink>

            <LocalizedClientLink
              href="/account/orders"
              className="flex items-center gap-x-2 px-4 py-2 text-sm hover:bg-ui-bg-subtle"
              onClick={() => setIsOpen(false)}
              data-testid="dropdown-orders-link"
            >
              <Package size={16} />
              <span>Orders</span>
            </LocalizedClientLink>

            <div className="border-t border-ui-border-base my-1"></div>

            <button
              type="button"
              className="flex items-center gap-x-2 px-4 py-2 text-sm hover:bg-ui-bg-subtle w-full text-left"
              onClick={handleLogout}
              data-testid="dropdown-logout-button"
            >
              <ArrowRightOnRectangle />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountDropdown
