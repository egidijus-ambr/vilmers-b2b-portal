import { retrieveCustomer } from "@lib/data/customer"
import { getShopSettings } from "@lib/data/shop-settings"
import { CustomerProvider } from "@lib/context/customer-context"
import { ShopSettingsProvider } from "@lib/context/shop-settings-context"
import { CartProvider } from "@lib/context/cart-context"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"

interface CheckoutLayoutProps {
  children: React.ReactNode
  params: Promise<{ languageCode: string }>
}

export default async function CheckoutLayout({
  children,
  params,
}: CheckoutLayoutProps) {
  const customer = await retrieveCustomer()
  const shopSettings = await getShopSettings()

  return (
    <CustomerProvider customer={customer}>
      <ShopSettingsProvider initialShopSettings={shopSettings}>
        <CartProvider>
          <div className="w-full bg-white relative small:min-h-screen">
            <div className="h-16 bg-white border-b">
              <nav className="flex h-full items-center content-container justify-between">
                <LocalizedClientLink
                  href="/cart"
                  className="text-small-semi text-ui-fg-base flex items-center gap-x-2 uppercase flex-1 basis-0"
                >
                  <ChevronDown className="rotate-90" size={16} />
                  <span className="mt-px hidden small:block txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base">
                    Back to shopping cart
                  </span>
                  <span className="mt-px block small:hidden txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base">
                    Back
                  </span>
                </LocalizedClientLink>
                <div className="flex-1 basis-0" />
              </nav>
            </div>
            <div className="relative">
              {children}
            </div>
          </div>
        </CartProvider>
      </ShopSettingsProvider>
    </CustomerProvider>
  )
}
