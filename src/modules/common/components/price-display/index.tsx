"use client"

import React from "react"
import { convertToLocale } from "@lib/util/money"
import { useCanSeePrices } from "@lib/context/customer-context"

type Size = "sm" | "md" | "lg"
type Align = "left" | "right"

export type PriceDisplayProps = {
  regular: number | null | undefined
  discounted?: number | null
  currencyCode: string
  locale?: string
  size?: Size
  align?: Align
  className?: string
}

const sizeClasses: Record<Size, { regular: string; discounted: string }> = {
  sm: { regular: "text-xs", discounted: "text-xs font-semibold" },
  md: { regular: "text-sm", discounted: "text-sm font-semibold" },
  lg: { regular: "text-base", discounted: "text-lg font-semibold" },
}

/**
 * Renders either a single price or a dual strikethrough + discounted price.
 * Renders nothing when `regular` is null/undefined.
 */
const PriceDisplay: React.FC<PriceDisplayProps> = ({
  regular,
  discounted,
  currencyCode,
  locale,
  size = "md",
  align = "left",
  className = "",
}) => {
  const canSeePrices = useCanSeePrices()

  if (!canSeePrices) return null
  if (regular == null) return null

  const hasDiscount =
    discounted != null && discounted !== regular && discounted < regular

  const format = (amount: number) =>
    convertToLocale({ amount, currency_code: currencyCode, locale })

  const alignClass = align === "right" ? "items-end text-right" : "items-start"

  if (!hasDiscount) {
    return (
      <span className={`${sizeClasses[size].discounted} ${className}`}>
        {format(regular)}
      </span>
    )
  }

  return (
    <span className={`flex flex-col gap-y-0.5 ${alignClass} ${className}`}>
      <span
        className={`line-through text-ui-fg-muted ${sizeClasses[size].regular}`}
        data-testid="price-original"
      >
        {format(regular)}
      </span>
      <span
        className={`text-dark-blue ${sizeClasses[size].discounted}`}
        data-testid="price-discounted"
      >
        {format(discounted as number)}
      </span>
    </span>
  )
}

export default PriceDisplay
