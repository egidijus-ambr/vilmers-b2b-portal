"use client"

import { useTranslations } from "@lib/i18n"
import { useCart } from "@lib/context/cart-context"
import { useCustomer } from "@lib/context/customer-context"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import { isAgentOrAdmin } from "@lib/util/roles"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Button from "@modules/common/components/button"
import SaveCartButton from "@modules/cart/components/save-cart-button"
import { useCustomerDiscount } from "@lib/hooks/use-customer-discount"
import { applyDiscount } from "@configurator/lib/price-utils"
import PriceDisplay from "@modules/common/components/price-display"
import {
  getItemName,
  getItemImage,
  localeMap,
} from "@lib/util/cart-item-display"
import { FurnisystemsCartItem } from "@lib/furnisystems-sdk/modules/cart/types"

export default function CartSummary({
  children,
  items: itemsProp,
  title,
}: {
  children?: React.ReactNode
  items?: FurnisystemsCartItem[]
  title?: string
}) {
  const { t, language } = useTranslations("account")
  const ctx = useCart()
  const items = itemsProp ?? ctx.items
  const { discountPct } = useCustomerDiscount()
  const { customer } = useCustomer()
  const { actingCustomer } = useActingCustomer()
  const blockedNoActingCustomer = isAgentOrAdmin(customer) && !actingCustomer

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat(localeMap[language] || "en-GB", {
      style: "currency",
      currency: "EUR",
    }).format(price)
  }

  const totalPrice = items.reduce(
    (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
    0
  )
  const totalPriced = applyDiscount(totalPrice, discountPct)

  const totalVolume = items.reduce(
    (sum, item) => sum + (item.volume ?? 0) * (item.quantity ?? 1),
    0
  )

  return (
    <div className="bg-white pb-6 p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-medium text-gray-900 mb-6">
        {title ?? t("order-summary")}
      </h2>

      {/* Product list */}
      <div className="flex flex-col gap-y-6 mb-6">
        {items.map((item) => {
          const name = getItemName(item, language)
          const image = getItemImage(item)
          const quantity = item.quantity ?? 1
          const price = (item.price ?? 0) * quantity

          return (
            <div key={item.id} className="flex gap-x-4">
              <div className="w-[120px] h-[120px] flex-shrink-0 bg-product-card-background rounded">
                {image ? (
                  <img
                    src={image}
                    alt={name}
                    className="w-[120px] h-[120px] object-contain mix-blend-multiply"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                    {t("no-image")}
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-start min-w-0">
                <span className="text-base font-normal text-dark-blue">
                  {name}
                </span>
                <span className="text-sm font-light text-gray-500 mt-1">
                  Quantity: {quantity}
                </span>
                <span className="mt-4">
                  {(() => {
                    const itemPriced = applyDiscount(price, discountPct)
                    return (
                      <PriceDisplay
                        regular={price}
                        discounted={itemPriced.hasDiscount ? itemPriced.discounted : null}
                        currencyCode="EUR"
                        locale={localeMap[language] || "en-GB"}
                        size="md"
                        align="left"
                      />
                    )
                  })()}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Totals */}
      <div className=" pt-4">
        {totalVolume > 0 && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-[16px] font-normal text-gray-500">
                {t("total-volume")}
              </span>
              <span className="text-[16px] font-medium text-dark-blue">
                {totalVolume.toFixed(3)} m&sup3;
              </span>
            </div>
            <div className="border-t border-gray-200 my-3" />
          </>
        )}
        <div className="flex justify-between items-center">
          <span className="text-[18px] font-semibold text-dark-blue">
            TOTAL
          </span>
          <span>
            <PriceDisplay
              regular={totalPriced.regular}
              discounted={totalPriced.hasDiscount ? totalPriced.discounted : null}
              currencyCode="EUR"
              locale={localeMap[language] || "en-GB"}
              size="lg"
              align="right"
            />
          </span>
        </div>
      </div>
      <div className="mt-6">
        {children ?? (
          <>
            {blockedNoActingCustomer ? (
              <Button
                className="w-full"
                disabled
                title="Select a customer first"
              >
                Proceed to checkout
              </Button>
            ) : (
              <LocalizedClientLink href="/checkout" className="block">
                <Button className="w-full">
                  Proceed to checkout
                </Button>
              </LocalizedClientLink>
            )}
            <div className="mt-3">
              <SaveCartButton />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
