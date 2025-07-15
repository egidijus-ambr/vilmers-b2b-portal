"use client"

import { usePathname } from "next/navigation"
import { Suspense, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import AccountDropdown from "@modules/layout/components/account-dropdown"
import MobileMenu from "@modules/layout/components/mobile-menu"
import MobileMenuButton from "@modules/layout/components/mobile-menu-button"
import { CompactLanguageSwitcher, supportedLanguages } from "@lib/i18n"
import { t } from "i18next"

interface NavProps {
  customer: any
}

export default function Nav({ customer }: NavProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Check if we're on the home page
  const pathSegments = pathname.split("/").filter(Boolean)
  const isHomePage =
    pathname === "/" ||
    (pathSegments.length === 1 &&
      supportedLanguages.includes(pathSegments[0] as any))

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false)
  }

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
            {/* Desktop Account Menu */}
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
                  {t("log-in")}
                </LocalizedClientLink>
              )}
            </div>

            {/* Mobile Menu Button - Only show when customer is logged in and on small screens */}
            {customer && (
              <div className="flex small:hidden items-center h-full">
                <MobileMenuButton
                  isOpen={isMobileMenuOpen}
                  onClick={handleMobileMenuToggle}
                  isHomePage={isHomePage}
                />
              </div>
            )}

            {/* TEST: Mobile Menu Button for demo - Remove this in production */}
            {!customer && (
              <div className="flex small:hidden items-center h-full">
                <MobileMenuButton
                  isOpen={isMobileMenuOpen}
                  onClick={handleMobileMenuToggle}
                  isHomePage={isHomePage}
                />
              </div>
            )}

            {/* Mobile Login Link - Only show when customer is not logged in and on small screens */}
            {false && !customer && (
              <div className="flex small:hidden items-center h-full">
                <LocalizedClientLink
                  href="/account"
                  className={`text-base font-medium font-['Montserrat'] px-4 py-2 transition-colors ${
                    isHomePage ? "text-white " : "text-dark-blue  "
                  }`}
                  data-testid="nav-mobile-login-link"
                >
                  {t("log-in")}
                </LocalizedClientLink>
              </div>
            )}

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

      {/* Mobile Menu */}
      <MobileMenu
        customer={customer}
        isOpen={isMobileMenuOpen}
        onClose={handleMobileMenuClose}
      />
    </div>
  )
}
