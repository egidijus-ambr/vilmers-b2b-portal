"use client"

import { useCart } from "@lib/context/cart-context"
import { useTranslations } from "@lib/i18n"
import { FurnisystemsCartItem } from "@lib/furnisystems-sdk/modules/cart/types"

const localeMap: Record<string, string> = {
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  lt: "lt-LT",
  da: "da-DK",
}

function getItemName(item: FurnisystemsCartItem, language: string): string {
  const container = item.product_container
  const singleProduct = container?.single_product
  const advancedProduct = container?.advanced_product
  const profiles =
    singleProduct?.product_profiles ||
    advancedProduct?.advanced_product_profiles ||
    []
  const localProfile =
    profiles.find((p) => p.language.toLowerCase() === language) || profiles[0]
  return localProfile?.name || "-"
}

function getItemImage(item: FurnisystemsCartItem): string | undefined {
  const container = item.product_container
  const images =
    container?.single_product?.images || container?.advanced_product?.images
  return (
    images?.[0]?.src_thumbnail ||
    images?.[0]?.src_xs ||
    images?.[0]?.src ||
    undefined
  )
}

export default function CheckoutSummary() {
  const { t, language } = useTranslations("account")
  const { items } = useCart()

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

  return (
    <div className="sticky top-[120px]">
      <div className="bg-white p-6">
        <h2 className="text-[1.75rem] font-light text-dark-blue mb-6">
          {t("order-summary")}
        </h2>

        <div className="flex flex-col gap-y-4 mb-6">
          {items.map((item) => {
            const name = getItemName(item, language)
            const image = getItemImage(item)
            const quantity = item.quantity ?? 1
            const price = (item.price ?? 0) * quantity

            return (
              <div key={item.id} className="flex gap-x-4">
                <div className="w-[80px] h-[80px] flex-shrink-0 bg-gold-10 rounded">
                  {image ? (
                    <img
                      src={image}
                      alt={name}
                      className="w-[80px] h-[80px] object-contain mix-blend-multiply"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      {t("no-image")}
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-start min-w-0">
                  <span className="text-sm font-normal text-dark-blue">{name}</span>
                  <span className="text-xs font-light text-gray-500 mt-1">
                    Qty: {quantity}
                  </span>
                  <span className="text-sm font-medium text-dark-blue mt-2">
                    {formatPrice(price)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-[18px] font-semibold text-dark-blue">TOTAL</span>
            <span className="text-[18px] font-semibold text-dark-blue">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
