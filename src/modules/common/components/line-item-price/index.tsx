"use client"

import { getPercentageDiff } from "@lib/util/get-precentage-diff"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import { useCustomerDiscount } from "@lib/hooks/use-customer-discount"
import { applyDiscount } from "@configurator/lib/price-utils"
import { useCanSeePrices } from "@lib/context/customer-context"

type LineItemPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemPriceProps) => {
  const canSeePrices = useCanSeePrices()
  const { discountPct } = useCustomerDiscount()
  const { total, original_total } = item
  const safeTotal = total ?? 0
  const baselineRegular = Math.max(original_total ?? safeTotal, safeTotal)
  const b2b = applyDiscount(safeTotal, discountPct)
  const effectivePrice = b2b.discounted
  const hasReducedPrice = effectivePrice < baselineRegular

  if (!canSeePrices) return null

  return (
    <div className="flex flex-col gap-x-2 text-ui-fg-subtle items-end">
      <div className="text-left">
        {hasReducedPrice && (
          <>
            <p>
              {style === "default" && (
                <span className="text-ui-fg-subtle">Original: </span>
              )}
              <span
                className="line-through text-ui-fg-muted"
                data-testid="product-original-price"
              >
                {convertToLocale({
                  amount: baselineRegular,
                  currency_code: currencyCode,
                })}
              </span>
            </p>
            {style === "default" && (
              <span className="text-ui-fg-interactive">
                -{getPercentageDiff(baselineRegular, effectivePrice || 0)}%
              </span>
            )}
          </>
        )}
        <span
          className={clx("text-base-regular", {
            "text-ui-fg-interactive": hasReducedPrice,
          })}
          data-testid="product-price"
        >
          {convertToLocale({
            amount: effectivePrice,
            currency_code: currencyCode,
          })}
        </span>
      </div>
    </div>
  )
}

export default LineItemPrice
