import { Metadata } from "next"

import { retrieveCustomer } from "@lib/data/customer"
import { getShopSettings } from "@lib/data/shop-settings"
import { getBaseURL } from "@lib/util/env"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import { supportedLanguages, SupportedLanguage } from "@lib/i18n"
import { CustomerProvider } from "@lib/context/customer-context"
import { ActingCustomerProvider } from "@lib/context/acting-customer-context"
import { ShopSettingsProvider } from "@lib/context/shop-settings-context"
import { CartProvider } from "@lib/context/cart-context"
import TawkToChat from "@modules/common/components/tawk-to-chat"
import { listMenuCategories } from "@lib/data/categories"
import { getActingCustomer, isImpersonatedByManager } from "@lib/data/acting-customer"
import {
  canShowAllProductsToggle,
  getShowAllProductsCookie,
} from "@lib/data/show-all-products"
import { getGoToConfiguratorActive } from "@lib/data/go-to-configurator"
import { GoToConfiguratorProvider } from "@lib/context/go-to-configurator-context"
import { features } from "@lib/features"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

interface PageLayoutProps {
  children: React.ReactNode
  params: Promise<{ languageCode: string }>
}

export default async function PageLayout({
  children,
  params,
}: PageLayoutProps) {
  console.log("[PageLayout] Starting main page layout...")

  const customer = await retrieveCustomer()
  console.log(
    "[PageLayout] Customer retrieval result:",
    customer ? "customer found" : "no customer"
  )

  const [acting, impersonated] = await Promise.all([
    getActingCustomer(),
    isImpersonatedByManager(),
  ])

  const shopSettings = await getShopSettings()
  console.log(
    "[PageLayout] Shop settings retrieval result:",
    shopSettings ? "shop settings found" : "no shop settings"
  )

  // Extract language from URL parameter
  const resolvedParams = await params
  const language = resolvedParams.languageCode as SupportedLanguage
  const validLanguage = supportedLanguages.includes(language) ? language : "en"

  // Fetch menu categories for navigation
  const categories = await listMenuCategories(validLanguage)

  const [canShowAllProducts, showAllProductsActive, goToConfiguratorActive] =
    await Promise.all([
      canShowAllProductsToggle(),
      getShowAllProductsCookie(),
      getGoToConfiguratorActive(),
    ])

  const canShowGoToConfigurator = canShowAllProducts && features.configurator

  return (
    <CustomerProvider customer={customer}>
      <ActingCustomerProvider initialActingCustomer={acting} isImpersonatedByManager={impersonated}>
        <ShopSettingsProvider initialShopSettings={shopSettings}>
          <CartProvider>
            <GoToConfiguratorProvider initialActive={goToConfiguratorActive}>
              <div className="flex flex-col min-h-screen">
                <Nav
                  customer={customer}
                  categories={categories}
                  canShowAllProducts={canShowAllProducts}
                  showAllProductsActive={showAllProductsActive}
                  canShowGoToConfigurator={canShowGoToConfigurator}
                />
                <main className="flex-1">{children}</main>
                <Footer language={validLanguage} shopSettings={shopSettings} />
              </div>
            </GoToConfiguratorProvider>
            {features.tawk && <TawkToChat />}
          </CartProvider>
        </ShopSettingsProvider>
      </ActingCustomerProvider>
    </CustomerProvider>
  )
}
