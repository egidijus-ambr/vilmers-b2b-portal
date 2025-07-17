"use client"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import Image from "next/image"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import { signout } from "@lib/data/customer"

interface AccountDropdownProps {
  customer: (HttpTypes.StoreCustomer & { full_name?: string }) | null
  isHomePage?: boolean
}

const AccountDropdown = ({
  customer,
  isHomePage = false,
}: AccountDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { languageCode } = useParams() as { languageCode: string }

  const handleLogout = async () => {
    await signout(languageCode)
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
    return <></>
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`flex items-center gap-x-1 text-base font-medium font-['Montserrat'] ${
          isHomePage
            ? "text-white hover:text-gray-200"
            : "text-Dark-blue hover:text-ui-fg-base"
        }`}
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
              className="flex items-center gap-x-2 px-4 py-2 text-sm text-dark-blue hover:bg-ui-bg-subtle"
              onClick={() => setIsOpen(false)}
              data-testid="dropdown-dashboard-link"
            >
              <Image
                src="/images/profile-icon.svg"
                alt="Profile"
                width={16}
                height={16}
              />
              <span>Overview</span>
            </LocalizedClientLink>

            {/* <LocalizedClientLink
              href="/account/profile"
              className="flex items-center gap-x-2 px-4 py-2 text-sm text-dark-blue hover:bg-ui-bg-subtle"
              onClick={() => setIsOpen(false)}
              data-testid="dropdown-profile-link"
            >
              <Image
                src="/images/profile-icon.svg"
                alt="Profile"
                width={16}
                height={16}
              />
              <span>Profile</span>
            </LocalizedClientLink> */}

            <LocalizedClientLink
              href="/account/orders"
              className="flex items-center gap-x-2 px-4 py-2 text-sm text-dark-blue hover:bg-ui-bg-subtle"
              onClick={() => setIsOpen(false)}
              data-testid="dropdown-orders-link"
            >
              <Image
                src="/images/orders-icon.svg"
                alt="Orders"
                width={16}
                height={16}
              />
              <span>Orders</span>
            </LocalizedClientLink>

            <div className="border-t border-ui-border-base my-1"></div>

            <button
              type="button"
              className="flex items-center gap-x-2 px-4 py-2 text-sm text-dark-blue hover:bg-ui-bg-subtle w-full text-left"
              onClick={handleLogout}
              data-testid="dropdown-logout-button"
            >
              <Image
                src="/images/logout-icon.svg"
                alt="Logout"
                width={16}
                height={16}
              />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountDropdown
