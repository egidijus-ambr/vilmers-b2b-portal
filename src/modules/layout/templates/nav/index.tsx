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
  CompactLanguageSwitcher,
} from "@lib/i18n"
import { useSessionValidation } from "@lib/hooks/use-session-validation"
import { useCart } from "@lib/context/cart-context"
import { useShopSettings } from "@lib/context/shop-settings-context"
import { isAgentOrAdmin } from "@lib/util/roles"
import Cart from "@modules/common/icons/cart"
import { features } from "@lib/features"
import { activeTheme } from "themes"

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
  const { shopSettings } = useShopSettings()
  // Dark logo for the solid/white nav state (and the invert-fallback below).
  // default_manufacturer.logo_image is the general-purpose dark wordmark that
  // matches the hardcoded fallback's color/shape. Verified against live data.
  const solidLogoSrc =
    shopSettings?.default_manufacturer?.logo_image?.src || "/images/logo.svg"
  // footer_logo_image is authored white/light for the dark footer background
  // (bg-footer-background) — reused here for the transparent nav state
  // (also a dark/see-through background) so we render it as-is instead of
  // `brightness-0 invert`-ing the opaque-background manufacturer logo, which
  // previously produced a solid white rectangle instead of a white wordmark.
  const whiteLogoSrc = shopSettings?.footer_logo_image?.src

  const { topBar, backButton, searchButton, homepageHeader, languageSwitcher, logo } =
    activeTheme.layout

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
    // homepageHeader.transparent is a build-time constant: when false, the
    // nav is always solid, so there's no scroll-driven state to track.
    if (!homepageHeader.transparent) return
    if (!isHomePage) return
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    handleScroll() // check initial position (refresh while scrolled)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isHomePage])

  const isTransparent = homepageHeader.transparent && isHomePage && !isScrolled

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false)
  }

  // Determine menu items based on feature flag
  const useProductCatalog = features.productCatalog
  const menuItems =
    useProductCatalog && categories && categories.length > 0
      ? buildDynamicMenuItems(categories, t)
      : getNavigationConfig(t).menuItems

  // Logo-left layout (Dominari): the nav menu moves into the right cluster
  // and is trimmed to Store only (Inspiration/Contact dropped everywhere —
  // desktop AND mobile drawer). Filtered by stable `id`, not the translated
  // label. Logo-center (Vilmers): unchanged, full menuItems, untouched.
  const isLogoLeft = logo.position === "left"
  const navMenuItems = isLogoLeft
    ? menuItems.filter((i) => i.id === "store")
    : menuItems

  // Logo — shared between the "center" cluster and the "left" cluster (see
  // `logo.position` below). Transparent state: prefer the already-white
  // `footer_logo_image` (rendered as-is, no filter); only fall back to
  // inverting the (opaque-background) solid logo when no white logo is set.
  // Solid state: always the dark solid logo, never inverted.
  const useWhiteLogo = isTransparent && !!whiteLogoSrc
  const logoImgSrc = useWhiteLogo ? whiteLogoSrc : solidLogoSrc
  const shouldInvertLogo = isTransparent && !whiteLogoSrc

  const logoElement = (
    <LocalizedClientLink
      href="/"
      className={`text-xl font-semibold uppercase ${
        isTransparent ? "hover:text-gray-200 text-white" : "hover:text-ui-fg-base"
      }`}
      data-testid="nav-store-link"
    >
      <img
        src={logoImgSrc}
        alt="Store Logo"
        className={`h-[var(--nav-logo-height-mobile)] small:h-[var(--nav-logo-height)] transition-[filter] duration-200 ${
          shouldInvertLogo ? "brightness-0 invert" : ""
        }`}
      />
    </LocalizedClientLink>
  )

  // Right-cluster order depends on where the language switcher lives:
  // "top-bar" (Vilmers, unchanged): Search, Cart, Account/Login.
  // "navbar" (e.g. Dominari): Cart, Account/Login, Search, Switcher — the
  // Search button moves to sit right before the switcher (see below).
  const isNavbarSwitcher = languageSwitcher.placement === "navbar"

  const searchButtonElement = (
    <button
      onClick={() => setIsSearchOpen(true)}
      className={`flex items-center justify-center w-8 h-8 small:w-10 small:h-10 transition-colors ${
        isTransparent ? "text-white hover:text-white/80" : "text-nav-foreground hover:text-nav-foreground/80"
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
  )

  return (
    <div
      className={`sticky top-0 inset-x-0 z-50 group ${
        homepageHeader.transparent ? "transition-[background-color] duration-200" : ""
      } ${isTransparent ? "bg-transparent" : "bg-base"}`}
    >
      {topBar.show && <TopBar />}
      <header
        className={`relative h-[var(--nav-height)] mx-auto border-b ${
          homepageHeader.transparent
            ? "duration-200 transition-[background-color,border-color]"
            : ""
        } ${
          isTransparent
            ? "bg-transparent border-transparent"
            : "bg-nav-background border-ui-border-base"
        }`}
      >
        <nav
          className={`w-full px-6 text-xs flex items-center justify-between h-full ${
            homepageHeader.transparent ? "transition-colors duration-200" : ""
          } ${isTransparent ? "text-white" : "text-ui-fg-subtle"}`}
        >
          <div
            className={`h-full flex items-center ${
              logo.position === "left" ? "" : "flex-1 basis-0"
            }`}
          >
            {/* Mobile Menu Button — mobile only, leftmost */}
            <div className="flex small:hidden items-center h-full">
              <MobileMenuButton
                isOpen={isMobileMenuOpen}
                onClick={handleMobileMenuToggle}
                isHomePage={isTransparent}
              />
            </div>

            {/* Logo — "left" position: start of the left cluster, before the
                desktop nav menu. Visible on mobile too (right after the
                hamburger) and on desktop (before the back button/nav menu). */}
            {logo.position === "left" && (
              <div className="flex items-center h-full mr-3">
                {logoElement}
              </div>
            )}

            {/* Back Button — desktop only */}
            {backButton.show && (
              <div className="hidden small:flex items-center h-full mr-3">
                <BackButton isHomePage={isTransparent} />
              </div>
            )}

            {/* Desktop Navigation Menu — logo-center only (Vilmers, unchanged,
                full menuItems). Logo-left (Dominari) moves this into the
                right cluster instead, trimmed to Store only (see below). */}
            {!isLogoLeft && (
              <div className="hidden small:flex items-center h-full">
                <NavMenu
                  menuItems={navMenuItems}
                  isHomePage={isTransparent}
                  isInteractive={isClient && isReady}
                />
              </div>
            )}
          </div>

          {/* Logo — "center" position: its own equal-flex cluster, balanced
              against the left/right clusters (both flex-1 basis-0). */}
          {logo.position === "center" && (
            <div className="flex items-center h-full">{logoElement}</div>
          )}

          <div className="flex items-center gap-x-2 small:gap-x-6 h-full flex-1 basis-0 justify-end">
            {/* Desktop Navigation Menu — logo-left only (Dominari): moved out
                of the left cluster (which becomes logo-only there) and into
                the START of the right cluster, trimmed to Store only, so it
                leads the group: Store, Login/account, Search, switcher. */}
            {isLogoLeft && (
              <div className="hidden small:flex items-center h-full">
                <NavMenu
                  menuItems={navMenuItems}
                  isHomePage={isTransparent}
                  isInteractive={isClient && isReady}
                />
              </div>
            )}

            {/* Search Button — "top-bar" placement (Vilmers, unchanged): first
                in the cluster. "navbar" placement: moved to just before the
                switcher (after Cart/Account), see below. Gated on
                `searchButton.show` in both placements. */}
            {!isNavbarSwitcher && searchButton.show && searchButtonElement}

            {/* Cart Button */}
            {isLoggedIn && (
              <LocalizedClientLink
                href="/cart"
                className={`flex items-center gap-x-2 text-sm font-medium transition-colors ${
                  isTransparent ? "text-white hover:text-white/80" : "text-nav-foreground hover:text-nav-foreground/80"
                }`}
                data-testid="nav-cart-link"
              >
                {/* Icon: visible on mobile, hidden on desktop */}
                <Cart className="h-5 w-5 small:hidden" />
                {/* Text label: hidden on mobile, visible on desktop */}
                <span className="hidden small:inline">Cart</span>
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
                  className={`${isNavbarSwitcher ? "text-sm" : "text-base"} font-medium px-4 py-2 transition-colors ${
                    isTransparent ? "text-white " : "text-nav-foreground  "
                  }`}
                  data-testid="nav-login-link"
                >
                  {isReady ? t("log-in") : ""}
                </LocalizedClientLink>
              )}
            </div>

            {/* Search Button — "navbar" placement only: after Cart/Account,
                immediately before the switcher. Gated on `searchButton.show`. */}
            {isNavbarSwitcher && searchButton.show && searchButtonElement}

            {/* Language Switcher — navbar placement, desktop only. Mobile
                keeps the drawer's own copy (see mobile-menu). Top-bar
                placement renders it in <TopBar/> instead (see top-bar). */}
            {isNavbarSwitcher && (
              <div
                className={`hidden small:flex items-center h-full ${
                  isTransparent ? "text-white" : "text-nav-foreground"
                }`}
              >
                <CompactLanguageSwitcher
                  size="small"
                  dropdownAlign="right"
                  variant="nav"
                />
              </div>
            )}

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

      {/* Mobile Menu — same filtered navMenuItems as desktop (logo-left
          drops Inspiration/Contact everywhere; logo-center is unchanged). */}
      <MobileMenu
        customer={customer}
        isOpen={isMobileMenuOpen}
        onClose={handleMobileMenuClose}
        isLoggedIn={isLoggedIn}
        navItems={navMenuItems}
      />

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  )
}
