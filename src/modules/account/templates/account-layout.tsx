"use client"

import React from "react"
import { usePathname, useParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import Link from "next/link"

import UnderlineLink from "@modules/common/components/interactive-link"
import OutlineButton from "@modules/common/components/outline-button"

import { ExtendedStoreCustomer } from "@lib/types/customer"

interface AccountLayoutProps {
  customer: ExtendedStoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  const pathname = usePathname()
  const params = useParams()
  const languageCode = params.languageCode as string
  const { t, ready: isReady } = useTranslation("common")

  // Check if this is the login page (when customer is null)
  const isLoginPage = !customer

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
                <Link href={`/${languageCode}/become-partner`}>
                  <OutlineButton showArrow>
                    {t("become-a-partner")}
                  </OutlineButton>
                </Link>
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
    <div className="min-h-screen bg-gold-10 pb-20" data-testid="account-page">
      {children}
    </div>
  )
}

export default AccountLayout
