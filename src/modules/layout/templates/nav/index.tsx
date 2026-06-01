"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import AccountDropdown from "@modules/layout/components/account-dropdown"
import MobileMenu from "@modules/layout/components/mobile-menu"
import MobileMenuButton from "@modules/layout/components/mobile-menu-button"
import BackButton from "@modules/layout/components/back-button"
import TopBar from "@modules/layout/components/top-bar"
import CustomerSelector from "@modules/layout/components/customer-selector"
import ActingCustomerCallout from "@modules/layout/components/acting-customer-callout"
import ShowAllProductsToggle from "@modules/layout/components/show-all-products-toggle"
import GoToConfiguratorToggle from "@modules/layout/components/go-to-configurator-toggle"
import SearchModal from "@modules/search/components/search-modal"
import { getNavigationConfig, buildDynamicMenuItems } from "@modules/layout/config/navigation"
import type { CategoryData } from "@lib/furnisystems-sdk"
import {
  supportedLanguages,
  useTranslations,
} from "@lib/i18n"
import { useSessionValidation } from "@lib/hooks/use-session-validation"
import { useCart } from "@lib/context/cart-context"
import { isAgentOrAdmin } from "@lib/util/roles"

// Import NavMenu normally for SSR
import NavMenu from "@modules/layout/components/nav-menu"

interface NavProps {
  customer: any
  categories?: CategoryData[]
  canShowAllProducts: boolean
  showAllProductsActive: boolean
  canShowGoToConfigurator: boolean
}

export default function Nav({ customer, categories, canShowAllProducts, showAllProductsActive, canShowGoToConfigurator }: NavProps) {
  const pathname = usePathname()
  const { t, isReady } = useTranslations()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { isSessionValid, isSessionLoading } = useSessionValidation()
  const { items } = useCart()
  const totalCartItems = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Determine if user is truly logged in
  // Since JWT cookie is httpOnly, client-side validation can't access it
  // We need to rely primarily on server-side customer data
  const isLoggedIn = !!customer

  // Check if we're on the home page
  const pathSegments = pathname.split("/").filter(Boolean)
  const isHomePage =
    pathname === "/" ||
    (pathSegments.length === 1 &&
      supportedLanguages.includes(pathSegments[0] as any))

  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    if (!isHomePage) return
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    handleScroll() // check initial position (refresh while scrolled)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isHomePage])

  const isTransparent = isHomePage && !isScrolled

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false)
  }

  // Determine menu items based on feature flag
  const useProductCatalog =
    process.env.NEXT_PUBLIC_FEATURE_PRODUCT_CATALOG === "true"
  const menuItems =
    useProductCatalog && categories && categories.length > 0
      ? buildDynamicMenuItems(categories, t)
      : getNavigationConfig(t).menuItems

  return (
    <div
      className={`sticky top-0 inset-x-0 z-50 group transition-[background-color] duration-200 ${
        isTransparent ? "bg-transparent" : "bg-base"
      }`}
    >
      <TopBar />
      <header
        className={`relative h-[72px] mx-auto border-b duration-200 transition-[background-color,border-color] ${
          isTransparent
            ? "bg-transparent border-transparent"
            : "bg-white border-ui-border-base"
        }`}
      >
        <nav
          className={`w-full px-6 text-xs flex items-center justify-between h-full transition-colors duration-200 ${
            isTransparent ? "text-white" : "text-ui-fg-subtle"
          }`}
        >
          <div className="flex-1 basis-0 h-full flex items-center">
            {/* Back Button */}
            <BackButton isHomePage={isTransparent} className="mr-3" />

            {/* Desktop Navigation Menu */}
            <div className="hidden small:flex items-center h-full">
              <NavMenu
                menuItems={menuItems}
                isHomePage={isTransparent}
                isInteractive={isClient && isReady}
              />
            </div>
          </div>
          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className={`text-xl font-semibold uppercase ${
                isTransparent
                  ? "hover:text-gray-200 text-white"
                  : "hover:text-ui-fg-base"
              }`}
              data-testid="nav-store-link"
            >
              <img
                src="/images/logo.svg"
                alt="Store Logo"
                className={`h-6 transition-[filter] duration-200 ${isTransparent ? "brightness-0 invert" : ""}`}
              />
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            {/* Desktop Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`hidden small:flex items-center justify-center w-10 h-10 transition-colors ${
                isTransparent ? "text-white hover:text-white/80" : "text-dark-blue hover:text-dark-blue/80"
              }`}
              aria-label="Search products"
              data-testid="nav-search-button"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* Desktop Cart Button */}
            {isLoggedIn && (
              <LocalizedClientLink
                href="/cart"
                className={`hidden small:flex items-center gap-x-2 text-base font-medium font-['Montserrat'] transition-colors ${
                  isTransparent ? "text-white hover:text-white/80" : "text-dark-blue hover:text-dark-blue/80"
                }`}
                data-testid="nav-cart-link"
              >
                <span>Cart</span>
                {totalCartItems > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-dark-blue text-white text-xs font-semibold leading-none">
                    {totalCartItems}
                  </span>
                )}
              </LocalizedClientLink>
            )}

            {/* Desktop Account Menu */}
            <div className="hidden small:flex items-center gap-x-6 h-full">
              {isLoggedIn ? (
                <AccountDropdown customer={customer} isHomePage={isTransparent} />
              ) : (
                <LocalizedClientLink
                  href="/account"
                  className={`text-base font-medium font-['Montserrat'] px-4 py-2 transition-colors ${
                    isTransparent ? "text-white " : "text-dark-blue  "
                  }`}
                  data-testid="nav-login-link"
                >
                  {isReady ? t("log-in") : ""}
                </LocalizedClientLink>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex small:hidden items-center h-full">
              <MobileMenuButton
                isOpen={isMobileMenuOpen}
                onClick={handleMobileMenuToggle}
                isHomePage={isTransparent}
              />
            </div>
          </div>
        </nav>
      </header>

      {/* Agent / Admin sub-header: callout + customer selector, right-aligned */}
      {!isHomePage && isAgentOrAdmin(customer) && (
        <div className="flex h-10 items-center justify-end gap-4 border-b border-line bg-beige-20 px-6">
          <ActingCustomerCallout />
          {canShowAllProducts && (
            <ShowAllProductsToggle initialChecked={showAllProductsActive} />
          )}
          {canShowGoToConfigurator && <GoToConfiguratorToggle />}
          <CustomerSelector />
        </div>
      )}

      {/* Mobile Menu */}
      <MobileMenu
        customer={customer}
        isOpen={isMobileMenuOpen}
        onClose={handleMobileMenuClose}
        isLoggedIn={isLoggedIn}
      />

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  )
}
