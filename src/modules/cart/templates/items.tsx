"use client"

import { HttpTypes } from "@medusajs/types"
import { Heading } from "@medusajs/ui"
import ProductItemsTable from "@modules/common/components/product-items-table"
import { cartLineItemToProductItemRow } from "@modules/common/components/product-items-table/mappers"
import CartItemActions from "@modules/cart/components/cart-item-actions"
import { useTranslations } from "@lib/i18n"
import repeat from "@lib/util/repeat"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
}

const localeMap: Record<string, string> = {
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  lt: "lt-LT",
  da: "da-DK",
}

const ItemsTemplate = ({ cart }: ItemsTemplateProps) => {
  const { t, language } = useTranslations("account")
  const items = cart?.items

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat(localeMap[language] || "en-GB", {
      style: "currency",
      currency: cart?.currency_code || "EUR",
    }).format(price)
  }

  const showVolume = process.env.NEXT_PUBLIC_SHOW_VOLUME === "true"

  const mappedItems = items
    ? items
        .sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1))
        .map(cartLineItemToProductItemRow)
    : []

  return (
    <div>
      <div className="pb-3 flex items-center">
        <Heading className="text-[2rem] leading-[2.75rem]">
          {t("order-items")}
        </Heading>
      </div>
      {items ? (
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
            <CartItemActions itemId={item.id} quantity={item.quantity} />
          )}
        />
      ) : (
        <div className="flex flex-col gap-y-4">
          {repeat(5).map((i) => (
            <SkeletonLineItem key={i} />
          ))}
        </div>
      )}
    </div>
  )
}

export default ItemsTemplate
