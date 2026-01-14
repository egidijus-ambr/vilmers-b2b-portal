"use client"

import { useParams } from "next/navigation"
import Image from "next/image"

import NavMenu from "@modules/layout/components/nav-menu"
import { MenuItem } from "@modules/layout/components/nav-menu-item"
import { signout } from "@lib/data/customer"
import { t } from "i18next"
import { ExtendedStoreCustomer } from "@lib/types/customer"

interface AccountDropdownProps {
  customer: ExtendedStoreCustomer | null
  isHomePage?: boolean
}

const AccountDropdown = ({
  customer,
  isHomePage = false,
}: AccountDropdownProps) => {
  const { languageCode } = useParams() as { languageCode: string }

  const handleLogout = async () => {
    await signout(languageCode)
    // The signout function already handles the redirect to the login page
  }

  const displayName = customer?.full_name || customer?.name || "Account"

  if (!customer) {
    return <></>
  }

  // Create account menu items using the same structure as navigation
  const accountMenuItems: MenuItem[] = [
    {
      id: "account-dropdown",
      label: displayName,
      type: "dropdown",
      href: "/account",
      dropdown: {
        width: "w-48",
        layout: "single-column",
        items: [
          {
            label: (
              <div className="flex items-center gap-x-2">
                <Image
                  src="/images/profile-icon.svg"
                  alt="Profile"
                  width={16}
                  height={16}
                />
                <span>{t("overview")}</span>
              </div>
            ) as any,
            href: "/account",
          },
          {
            label: (
              <div className="flex items-center gap-x-2">
                <Image
                  src="/images/orders-icon.svg"
                  alt="Orders"
                  width={16}
                  height={16}
                />
                <span>{t("orders")}</span>
              </div>
            ) as any,
            href: "/account/orders",
          },
          {
            label: (
              <div className="flex items-center gap-x-2">
                <Image
                  src="/images/logout-icon.svg"
                  alt="Logout"
                  width={16}
                  height={16}
                />
                <span>{t("log-out")}</span>
              </div>
            ) as any,
            href: "/logout",
            onClick: handleLogout,
          },
        ],
      },
    },
  ]

  return <NavMenu menuItems={accountMenuItems} isHomePage={isHomePage} />
}

export default AccountDropdown
