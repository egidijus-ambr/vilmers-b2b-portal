import React from "react"

import UnderlineLink from "@modules/common/components/interactive-link"
import OutlineButton from "@modules/common/components/outline-button"

import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  // Check if this is the login page (when customer is null)
  const isLoginPage = !customer

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
                The best design reflects your personality—imagine it before you
                buy.
              </h1>
              <div>
                <OutlineButton showArrow>Become a partner</OutlineButton>
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
      className="flex-1 small:py-12 min-h-screen bg-cover bg-center bg-no-repeat relative"
      data-testid="account-page"
      style={{ backgroundImage: "url(/images/image.png)" }}
    >
      {/* Optional overlay for better readability */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>

      {/* Content container */}
      <div className="relative z-10 flex-1 content-container h-full max-w-5xl mx-auto flex flex-col">
        <div className="grid grid-cols-1 small:grid-cols-[240px_1fr] py-12">
          <div className="bg-white bg-opacity-95 rounded-lg shadow-lg p-4 h-fit">
            {customer && <AccountNav customer={customer} />}
          </div>
          <div className="flex-1 ml-0 small:ml-4">
            <div className="bg-white bg-opacity-95 rounded-lg shadow-lg p-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
