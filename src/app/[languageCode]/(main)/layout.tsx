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
import { getActingCustomer } from "@lib/data/acting-customer"

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

  const acting = await getActingCustomer()
  console.log(
    "[PageLayout] Acting customer retrieval result:",
    acting ? "acting customer present" : "no acting customer"
  )

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

  return (
    <CustomerProvider customer={customer}>
      <ActingCustomerProvider initialActingCustomer={acting}>
        <ShopSettingsProvider initialShopSettings={shopSettings}>
          <CartProvider>
            <div className="flex flex-col min-h-screen">
              <Nav customer={customer} categories={categories} />
              <main className="flex-1">{children}</main>
              <Footer language={validLanguage} />
            </div>
            {process.env.NEXT_PUBLIC_TAWK_ENABLED !== "false" && <TawkToChat />}
          </CartProvider>
        </ShopSettingsProvider>
      </ActingCustomerProvider>
    </CustomerProvider>
  )
}
