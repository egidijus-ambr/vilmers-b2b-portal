"use client"

import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import { useCustomerDiscount } from "@lib/hooks/use-customer-discount"
import { applyDiscount } from "@configurator/lib/price-utils"
import { useCanSeePrices } from "@lib/context/customer-context"

type LineItemUnitPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemUnitPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemUnitPriceProps) => {
  const canSeePrices = useCanSeePrices()
  const { discountPct } = useCustomerDiscount()
  const { total, original_total } = item
  const safeTotal = total ?? 0
  const quantity = item.quantity || 1
  const baselineUnitRegular = Math.max(original_total ?? safeTotal, safeTotal) / quantity
  const effectiveUnit = applyDiscount(safeTotal / quantity, discountPct).discounted
  const hasReducedPrice = effectiveUnit < baselineUnitRegular

  const percentage_diff = hasReducedPrice
    ? Math.round(((baselineUnitRegular - effectiveUnit) / baselineUnitRegular) * 100)
    : 0

  if (!canSeePrices) return null

  return (
    <div className="flex flex-col text-ui-fg-muted justify-center h-full">
      {hasReducedPrice && (
        <>
          <p>
            {style === "default" && (
              <span className="text-ui-fg-muted">Original: </span>
            )}
            <span
              className="line-through"
              data-testid="product-unit-original-price"
            >
              {convertToLocale({
                amount: baselineUnitRegular,
                currency_code: currencyCode,
              })}
            </span>
          </p>
          {style === "default" && (
            <span className="text-ui-fg-interactive">-{percentage_diff}%</span>
          )}
        </>
      )}
      <span
        className={clx("text-base-regular", {
          "text-ui-fg-interactive": hasReducedPrice,
        })}
        data-testid="product-unit-price"
      >
        {convertToLocale({
          amount: effectiveUnit,
          currency_code: currencyCode,
        })}
      </span>
    </div>
  )
}

export default LineItemUnitPrice
