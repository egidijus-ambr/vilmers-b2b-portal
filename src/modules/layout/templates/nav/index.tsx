"use client"

import { usePathname } from "next/navigation"
import { Suspense } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import AccountDropdown from "@modules/layout/components/account-dropdown"
import { CompactLanguageSwitcher } from "@lib/i18n"

interface NavProps {
  customer: any
}

export default function Nav({ customer }: NavProps) {
  const pathname = usePathname()

  // Check if we're on the home page
  const isHomePage = pathname === "/" || Boolean(pathname.match(/^\/[a-z]{2}$/)) // matches "/" or "/us", "/en", etc.

  return (
    <div
      className={`sticky top-0 inset-x-0 z-50 group ${
        isHomePage ? "bg-transparent" : "bg-base"
      }`}
    >
      <header
        className={`relative h-[72px] mx-auto border-b duration-200 ${
          isHomePage
            ? "bg-transparent border-transparent"
            : "bg-white border-ui-border-base"
        }`}
      >
        <nav
          className={`content-container txt-xsmall-plus flex items-center justify-between w-full h-full text-small-regular ${
            isHomePage ? "text-white" : "text-ui-fg-subtle"
          }`}
        >
          <div className="flex-1 basis-0 h-full flex items-center">
            <CompactLanguageSwitcher />
            <div className="h-full">{/* <SideMenu regions={regions} /> */}</div>
          </div>

          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className={`txt-compact-xlarge-plus uppercase ${
                isHomePage
                  ? "hover:text-gray-200 text-white"
                  : "hover:text-ui-fg-base"
              }`}
              data-testid="nav-store-link"
            >
              <img
                src="/images/logo.svg"
                alt="Store Logo"
                className={`h-6 ${isHomePage ? "brightness-0 invert" : ""}`}
              />
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            <div className="hidden small:flex items-center gap-x-6 h-full">
              {customer ? (
                <AccountDropdown customer={customer} isHomePage={isHomePage} />
              ) : (
                <LocalizedClientLink
                  href="/account"
                  className={`text-base font-medium font-['Montserrat'] px-4 py-2 transition-colors ${
                    isHomePage ? "text-white " : "text-dark-blue  "
                  }`}
                  data-testid="nav-login-link"
                >
                  Login
                </LocalizedClientLink>
              )}
            </div>

            {/* <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-ui-fg-base flex gap-2"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense> */}
          </div>
        </nav>
      </header>
    </div>
  )
}
