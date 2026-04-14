"use client"

import { Heading } from "@medusajs/ui"
import ProductItemsTable from "@modules/common/components/product-items-table"
import { furnisystemsCartItemToProductItemRow } from "@modules/common/components/product-items-table/mappers"
import CartItemActions from "@modules/cart/components/cart-item-actions"
import { useTranslations } from "@lib/i18n"
import { useCart } from "@lib/context/cart-context"
import Spinner from "@modules/common/icons/spinner"

const localeMap: Record<string, string> = {
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  lt: "lt-LT",
  da: "da-DK",
}

const ItemsTemplate = () => {
  const { t, language } = useTranslations("account")
  const { items, isLoading } = useCart()

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat(localeMap[language] || "en-GB", {
      style: "currency",
      currency: "EUR",
    }).format(price)
  }

  const showVolume = process.env.NEXT_PUBLIC_SHOW_VOLUME === "true"

  const mappedItems = items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((item) => furnisystemsCartItemToProductItemRow(item, language))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div>
      <div className="pb-3 flex items-center">
        <Heading className="text-[2rem] leading-[2.75rem]">
          {t("order-items")}
        </Heading>
      </div>
      <ProductItemsTable
        items={mappedItems}
        formatPrice={formatPrice}
        showVolume={showVolume}
        translations={{
          orderItems: t("order-items"),
          unitPrice: t("unit-price"),
          quantity: t("quantity-short"),
          volume: t("volume"),
          total: t("total"),
          noImage: t("no-image"),
          customerReference: t("customer-reference"),
          showConfiguration: t("show-configuration"),
          hideConfiguration: t("hide-configuration"),
        }}
        renderActions={(item) => (
          <CartItemActions
            cartItemId={Number(item.id)}
            quantity={item.quantity}
          />
        )}
      />
    </div>
  )
}

export default ItemsTemplate
