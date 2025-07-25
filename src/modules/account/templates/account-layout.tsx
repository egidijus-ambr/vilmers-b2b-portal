"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import UnderlineLink from "@modules/common/components/interactive-link"
import OutlineButton from "@modules/common/components/outline-button"

import AccountDropdown from "@modules/layout/components/account-dropdown"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  const pathname = usePathname()
  const { t, ready: isReady } = useTranslation("common")

  // Check if this is the login page (when customer is null)
  const isLoginPage = !customer

  // Check if we're on the main account page or orders page (should hide AccountNav)
  const isMainAccountPage = pathname.endsWith("/account")
  const isOrdersPage = pathname.endsWith("/account/orders")
  const showAccountNav = customer && !isMainAccountPage && !isOrdersPage

  // Show loading state while translations are loading to prevent flicker
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (isLoginPage) {
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat relative flex items-center"
        data-testid="account-page"
        style={{ backgroundImage: "url(/images/login_background.png)" }}
      >
        {/* Optional overlay for better readability */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>

        {/* Content container */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center lg:justify-between min-h-screen py-12">
            {/* Left side - Text content */}
            <div className="hidden lg:block flex-1 max-w-2xl">
              <h1 className="w-full max-w-[670px] font-medium text-[28px] lg:text-[40px] leading-[40px] lg:leading-[56px] text-white mb-8">
                {t("login-welcome-main-text")}
              </h1>
              <div>
                <a href="mailto:sales.development@vilmers.com">
                  <OutlineButton showArrow>
                    {t("become-a-partner")}
                  </OutlineButton>
                </a>
              </div>
            </div>

            {/* Right side - Login form */}
            <div className="w-full max-w-md lg:ml-8">
              <div className="bg-white shadow-xl p-6 sm:p-8">{children}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default layout for logged-in users (dashboard)
  return (
    <div
      className="min-h-screen  bg-gold-10  pb-20 relative"
      data-testid="account-page"
    >
      {/* Content container */}
      <div className="flex-1 max-w-[1440px] mx-auto flex flex-col">
        <div
          className={`grid ${
            showAccountNav
              ? "grid-cols-1 small:grid-cols-[240px_1fr] gap-4"
              : "grid-cols-1"
          }`}
        >
          {showAccountNav && (
            <div className="bg-white rounded-lg shadow-lg p-4 h-fit">
              <AccountDropdown customer={customer} />
            </div>
          )}
          <div className={`flex-1 ${showAccountNav ? "" : ""}`}>
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
