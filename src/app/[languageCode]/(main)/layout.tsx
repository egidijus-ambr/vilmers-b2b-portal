import { Metadata } from "next"

import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getBaseURL } from "@lib/util/env"
import { StoreCartShippingOption } from "@medusajs/types"
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"
import { supportedLanguages, SupportedLanguage } from "@lib/i18n"

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

  const cart = await retrieveCart()
  let shippingOptions: StoreCartShippingOption[] = []

  if (cart) {
    const { shipping_options } = await listCartOptions()

    shippingOptions = shipping_options
  }

  // Extract language from URL parameter
  const resolvedParams = await params
  const language = resolvedParams.languageCode as SupportedLanguage
  const validLanguage = supportedLanguages.includes(language) ? language : "en"

  return (
    <>
      <Nav customer={customer} />
      {customer && cart && (
        <CartMismatchBanner customer={customer} cart={cart} />
      )}

      {cart && (
        <FreeShippingPriceNudge
          variant="popup"
          cart={cart}
          shippingOptions={shippingOptions}
        />
      )}
      {children}
      <Footer language={validLanguage} />
    </>
  )
}
